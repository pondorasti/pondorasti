/** The one `fetch` call shape used here, so tests can stand in for GitHub. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>

export interface GitHub {
  token: string
  /** `owner/name`. */
  repository: string
  branch: string
  fetch?: Fetch
}

/** What to commit, given the files' current text; null to commit nothing. */
export type Edit = (
  files: Record<string, string>
) => { files: Record<string, string>; message: string } | null

export class GitHubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const ATTEMPTS = 3

/**
 * Reads `paths` at the branch head, applies `edit`, and commits the files it changed as one
 * commit on top of that head. The branch only moves forward: when another push lands first,
 * the update is rejected and the whole read-edit-commit starts again from the new head.
 */
export async function commitFiles(
  github: GitHub,
  paths: string[],
  edit: Edit
): Promise<{ sha: string; url: string } | null> {
  const send: Fetch = github.fetch ?? ((url, init) => fetch(url, init))
  const api = async <T>(method: string, path: string, body?: unknown, raw = false) => {
    const response = await send(`https://api.github.com/repos/${github.repository}${path}`, {
      method,
      headers: {
        accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        authorization: `Bearer ${github.token}`,
        "content-type": "application/json",
        "user-agent": "macro-health-ingest",
        "x-github-api-version": "2022-11-28"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      throw new GitHubError(
        `GitHub ${method} ${path}: ${response.status} ${detail}`,
        response.status
      )
    }
    return (raw ? await response.text() : await response.json()) as T
  }
  const ref = `heads/${github.branch}`

  for (let attempt = 1; ; attempt++) {
    const head = await api<{ object: { sha: string } }>("GET", `/git/ref/${ref}`)
    const parent = head.object.sha
    const commit = await api<{ tree: { sha: string } }>("GET", `/git/commits/${parent}`)
    const current = Object.fromEntries(
      await Promise.all(
        paths.map(async (path) => [
          path,
          await api<string>("GET", `/contents/${encodeURI(path)}?ref=${parent}`, undefined, true)
        ])
      )
    ) as Record<string, string>

    const change = edit(current)
    const changed = change
      ? Object.entries(change.files).filter(([path, text]) => text !== current[path])
      : []
    if (!change || !changed.length) return null

    const tree = await api<{ sha: string }>("POST", "/git/trees", {
      base_tree: commit.tree.sha,
      tree: changed.map(([path, content]) => ({ path, mode: "100644", type: "blob", content }))
    })
    const created = await api<{ sha: string; html_url: string }>("POST", "/git/commits", {
      message: change.message,
      tree: tree.sha,
      parents: [parent]
    })
    try {
      await api("PATCH", `/git/refs/${ref}`, { sha: created.sha, force: false })
      return { sha: created.sha, url: created.html_url }
    } catch (error) {
      const raced = error instanceof GitHubError && (error.status === 409 || error.status === 422)
      if (!raced || attempt >= ATTEMPTS) throw error
    }
  }
}
