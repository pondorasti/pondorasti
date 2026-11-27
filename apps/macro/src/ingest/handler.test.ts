import { describe, expect, it } from "vite-plus/test"
import { INGEST_PATH, type IngestEnv, ingest } from "./handler"

const WEIGH_INS = "apps/macro/content/weigh-ins.csv"
const ENERGY = "apps/macro/content/energy.csv"
const ENV: IngestEnv = {
  HEALTH_INGEST_TOKEN: "ingest-test-token",
  GITHUB_TOKEN: "github-test-token",
  GITHUB_REPOSITORY: "owner/repo",
  GITHUB_BRANCH: "main"
}
const NOW = Date.parse("2026-11-27T12:00:00-08:00")

interface Commit {
  sha: string
  files: Record<string, string>
  message: string
  parents: string[]
}

/** An in-memory repository behind the few GitHub REST endpoints the ingest uses. */
function fakeGitHub(files: Record<string, string>) {
  let count = 0
  const root: Commit = { sha: "c0", files, message: "root", parents: [] }
  const commits = new Map([[root.sha, root]])
  const trees = new Map<string, Record<string, string>>([["t-c0", files]])
  const repo = { head: root.sha, commits, requests: [] as string[], beforeUpdate: () => {} }

  const push = (edit: Record<string, string>, message: string) => {
    const sha = `c${++count}`
    commits.set(sha, {
      sha,
      files: { ...commits.get(repo.head)!.files, ...edit },
      message,
      parents: [repo.head]
    })
    trees.set(`t-${sha}`, commits.get(sha)!.files)
    repo.head = sha
  }

  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input)
    const method = init.method ?? "GET"
    const path = url.pathname.replace("/repos/owner/repo", "")
    repo.requests.push(`${method} ${path}`)
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer github-test-token")
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined

    if (method === "GET" && path === "/git/ref/heads/main") {
      return Response.json({ object: { sha: repo.head } })
    }
    if (method === "GET" && path.startsWith("/git/commits/")) {
      return Response.json({ tree: { sha: `t-${path.split("/").at(-1)}` } })
    }
    if (method === "GET" && path.startsWith("/contents/")) {
      const text = commits.get(url.searchParams.get("ref")!)?.files[path.slice(10)]
      return text === undefined ? new Response("", { status: 404 }) : new Response(text)
    }
    if (method === "POST" && path === "/git/trees") {
      const sha = `t${++count}`
      trees.set(sha, {
        ...trees.get(body.base_tree),
        ...Object.fromEntries(
          body.tree.map((entry: { path: string; content: string }) => [entry.path, entry.content])
        )
      })
      return Response.json({ sha })
    }
    if (method === "POST" && path === "/git/commits") {
      const sha = `c${++count}`
      commits.set(sha, {
        sha,
        files: trees.get(body.tree)!,
        message: body.message,
        parents: body.parents
      })
      return Response.json({ sha, html_url: `https://github.com/owner/repo/commit/${sha}` })
    }
    if (method === "PATCH" && path === "/git/refs/heads/main") {
      repo.beforeUpdate()
      if (body.force || commits.get(body.sha)?.parents[0] !== repo.head) {
        return Response.json({ message: "Update is not a fast forward" }, { status: 422 })
      }
      repo.head = body.sha
      return Response.json({ object: { sha: body.sha } })
    }
    return new Response("not found", { status: 404 })
  }

  return {
    repo,
    commits,
    requests: repo.requests,
    push,
    fetch,
    file: (path: string) => commits.get(repo.head)!.files[path]
  }
}

const post = (body: unknown, token = "ingest-test-token") =>
  new Request(`https://macro.alexandru.so${INGEST_PATH}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  })

const EXPORT = {
  data: {
    metrics: [
      {
        name: "weight_body_mass",
        units: "kg",
        data: [
          { qty: 53.9, date: "2026-11-27 08:31:12 -0800", source: "Fitdays" },
          { qty: 53.81, date: "2026-11-27 08:34:40 -0800", source: "Fitdays" },
          { qty: 54.4, date: "2026-11-26 20:10:00 -0800", source: "Fitdays" },
          { qty: 53.48, date: "2026-11-26 10:15:00 -0800", source: "Fitdays" }
        ]
      },
      {
        name: "basal_energy_burned",
        units: "kcal",
        data: [
          { qty: 1566.6, date: "2026-11-25 00:00:00 -0800" },
          { qty: 1571.2, date: "2026-11-26 00:00:00 -0800" },
          { qty: 1020, date: "2026-11-27 00:00:00 -0800" }
        ]
      },
      {
        name: "active_energy",
        units: "kcal",
        data: [
          { qty: 612.5, date: "2026-11-25 00:00:00 -0800" },
          { qty: 700.4, date: "2026-11-26 00:00:00 -0800" },
          { qty: 300, date: "2026-11-27 00:00:00 -0800" }
        ]
      }
    ]
  }
}

const repoFiles = () => ({
  [WEIGH_INS]: "date,time,kg\n2026-11-26,10:15,53.48\n",
  [ENERGY]: "date,resting_kcal,active_kcal\n2026-11-25,1567,613\n"
})

describe("health ingest", () => {
  it("commits the new morning weigh-in and finished days as one commit", async () => {
    const github = fakeGitHub(repoFiles())
    const response = await ingest(post(EXPORT), ENV, { fetch: github.fetch, now: () => NOW })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      weighIns: {
        added: ["2026-11-27,08:34,53.81"],
        skipped: [{ date: "2026-11-26", reason: "morning reading already logged" }]
      },
      energy: {
        added: ["2026-11-26,1571,700"],
        skipped: [
          { date: "2026-11-25", reason: "already logged" },
          { date: "2026-11-27", reason: "day isn't over" }
        ]
      },
      commit: `https://github.com/owner/repo/commit/${github.repo.head}`
    })
    expect(github.file(WEIGH_INS)).toBe(
      "date,time,kg\n2026-11-26,10:15,53.48\n2026-11-27,08:34,53.81\n"
    )
    expect(github.file(ENERGY)).toBe(
      "date,resting_kcal,active_kcal\n2026-11-25,1567,613\n2026-11-26,1571,700\n"
    )
    expect(github.commits.get(github.repo.head)?.message).toBe(
      "macro: sync weigh-in and energy from Apple Health\n\n" +
        "weigh-ins.csv: 2026-11-27,08:34,53.81\nenergy.csv: 2026-11-26,1571,700\n"
    )
  })

  it("commits nothing when the same data arrives again", async () => {
    const github = fakeGitHub(repoFiles())
    await ingest(post(EXPORT), ENV, { fetch: github.fetch, now: () => NOW })
    const head = github.repo.head

    const again = await ingest(post(EXPORT), ENV, { fetch: github.fetch, now: () => NOW + 60_000 })
    expect(again.status).toBe(200)
    expect(((await again.json()) as { commit: unknown }).commit).toBeNull()
    expect(github.repo.head).toBe(head)
  })

  it("redoes the commit on the new head when another push lands first", async () => {
    const github = fakeGitHub(repoFiles())
    let raced = false
    github.repo.beforeUpdate = () => {
      if (raced) return
      raced = true
      github.push(
        { [WEIGH_INS]: `${github.file(WEIGH_INS)}2026-11-27,08:34,53.81\n` },
        "macro: log weigh-in"
      )
    }
    const response = await ingest(post(EXPORT), ENV, { fetch: github.fetch, now: () => NOW })

    expect(response.status).toBe(200)
    const head = github.commits.get(github.repo.head)!
    expect(head.message).toBe(
      "macro: sync energy from Apple Health\n\nenergy.csv: 2026-11-26,1571,700\n"
    )
    expect(github.commits.get(head.parents[0]!)?.message).toBe("macro: log weigh-in")
    expect(github.file(WEIGH_INS)).toBe(
      "date,time,kg\n2026-11-26,10:15,53.48\n2026-11-27,08:34,53.81\n"
    )
  })

  it("reads only the files a payload touches, and nothing for other metrics", async () => {
    const github = fakeGitHub(repoFiles())
    const steps = { data: { metrics: [{ name: "step_count", units: "count", data: [] }] } }
    const response = await ingest(post(steps), ENV, { fetch: github.fetch, now: () => NOW })
    expect(await response.json()).toMatchObject({ commit: null })
    expect(github.requests).toEqual([])

    const energyOnly = { data: { metrics: EXPORT.data.metrics.slice(1) } }
    await ingest(post(energyOnly), ENV, { fetch: github.fetch, now: () => NOW })
    expect(github.requests.filter((request) => request.startsWith("GET /contents/"))).toEqual([
      `GET /contents/${ENERGY}`
    ])
  })

  it("rejects wrong methods, missing configuration, bad tokens and bad bodies", async () => {
    const github = fakeGitHub(repoFiles())
    const deps = { fetch: github.fetch, now: () => NOW }
    const get = new Request(`https://macro.alexandru.so${INGEST_PATH}`)
    expect((await ingest(get, ENV, deps)).status).toBe(405)
    expect((await ingest(post(EXPORT), { ...ENV, GITHUB_TOKEN: "" }, deps)).status).toBe(503)
    expect((await ingest(post(EXPORT, "wrong"), ENV, deps)).status).toBe(401)
    expect((await ingest(post("{"), ENV, deps)).status).toBe(400)
    const unknownUnits = await ingest(
      post({ data: { metrics: [{ name: "weight_body_mass", units: "st", data: [] }] } }),
      ENV,
      deps
    )
    expect(unknownUnits.status).toBe(400)
    expect(github.requests).toEqual([])
  })

  it("reports GitHub failures without committing", async () => {
    const github = fakeGitHub(repoFiles())
    const failing = async () => new Response("Bad credentials", { status: 401 })
    const response = await ingest(post(EXPORT), ENV, { fetch: failing, now: () => NOW })
    expect(response.status).toBe(502)
    expect(((await response.json()) as { error: string }).error).toContain("401 Bad credentials")
    expect(github.repo.head).toBe("c0")
  })
})
