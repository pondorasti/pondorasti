import { parseEnergy, parseWeighIns } from "../content/parse"
import { commitFiles, type Fetch, type GitHub } from "./github"
import { PayloadError, parseHealthExport } from "./payload"
import {
  type Skipped,
  appendLines,
  energyLine,
  localTime,
  newEnergyDays,
  newWeighIns,
  weighInLine
} from "./rows"

/** Where Health Auto Export's REST API automations POST. */
export const INGEST_PATH = "/api/health-auto-export"

const WEIGH_INS = "apps/macro/content/weigh-ins.csv"
const ENERGY = "apps/macro/content/energy.csv"

export interface IngestEnv {
  /** Shared secret Health Auto Export sends as `Authorization: Bearer <token>`. */
  HEALTH_INGEST_TOKEN?: string
  /** Fine-grained token with Contents read and write on `GITHUB_REPOSITORY`. */
  GITHUB_TOKEN?: string
  GITHUB_REPOSITORY: string
  GITHUB_BRANCH: string
}

export interface IngestDeps {
  fetch?: Fetch
  now?: () => number
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers })

/** Compares secrets in constant time by comparing their fixed-length digests. */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))
  const [a, b] = await Promise.all([digest(given), digest(expected)])
  let difference = 0
  for (const [i, byte] of a.entries()) difference |= byte ^ b[i]!
  return difference === 0
}

/**
 * Takes a Health Auto Export payload and commits any new morning weigh-ins and finished energy
 * days to the CSVs on GitHub, so the next Workers Builds deploy shows them. Repeated and
 * overlapping payloads are expected and commit nothing new.
 */
export async function ingest(
  request: Request,
  env: IngestEnv,
  deps: IngestDeps = {}
): Promise<Response> {
  if (request.method !== "POST") {
    return json(405, { error: "use POST" }, { allow: "POST" })
  }
  if (!env.HEALTH_INGEST_TOKEN || !env.GITHUB_TOKEN) {
    return json(503, { error: "ingest isn't configured: HEALTH_INGEST_TOKEN and GITHUB_TOKEN" })
  }
  const authorization = request.headers.get("authorization") ?? ""
  if (!(await sameSecret(authorization, `Bearer ${env.HEALTH_INGEST_TOKEN}`))) {
    return json(401, { error: "unauthorized" }, { "www-authenticate": "Bearer" })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: "body isn't JSON" })
  }
  let health
  try {
    health = parseHealthExport(body)
  } catch (error) {
    if (error instanceof PayloadError) return json(400, { error: error.message })
    throw error
  }

  const now = (deps.now ?? Date.now)()
  const today = localTime(now).date
  const result = {
    weighIns: { added: [] as string[], skipped: [] as Skipped[] },
    energy: { added: [] as string[], skipped: [] as Skipped[] },
    commit: null as string | null
  }
  const paths = [
    ...(health.readings.length ? [WEIGH_INS] : []),
    ...(health.energy.length ? [ENERGY] : [])
  ]
  if (!paths.length) return json(200, result)

  const github: GitHub = {
    token: env.GITHUB_TOKEN,
    repository: env.GITHUB_REPOSITORY,
    branch: env.GITHUB_BRANCH,
    fetch: deps.fetch
  }
  try {
    const commit = await commitFiles(github, paths, (files) => {
      const changed: Record<string, string> = {}
      const parts: string[] = []
      const lines: string[] = []

      const weighInsText = files[WEIGH_INS]
      if (weighInsText !== undefined) {
        const rows = newWeighIns(parseWeighIns(weighInsText, WEIGH_INS), health.readings, now)
        result.weighIns = { added: rows.added.map(weighInLine), skipped: rows.skipped }
        if (rows.added.length) {
          changed[WEIGH_INS] = appendLines(weighInsText, result.weighIns.added)
          parseWeighIns(changed[WEIGH_INS], WEIGH_INS)
          parts.push(rows.added.length === 1 ? "weigh-in" : "weigh-ins")
          lines.push(...result.weighIns.added.map((line) => `weigh-ins.csv: ${line}`))
        }
      }

      const energyText = files[ENERGY]
      if (energyText !== undefined) {
        const days = newEnergyDays(parseEnergy(energyText, ENERGY), health.energy, today)
        result.energy = { added: days.added.map(energyLine), skipped: days.skipped }
        if (days.added.length) {
          changed[ENERGY] = appendLines(energyText, result.energy.added)
          parseEnergy(changed[ENERGY], ENERGY)
          parts.push("energy")
          lines.push(...result.energy.added.map((line) => `energy.csv: ${line}`))
        }
      }

      if (!parts.length) return null
      return {
        files: changed,
        message: `macro: sync ${parts.join(" and ")} from Apple Health\n\n${lines.join("\n")}\n`
      }
    })
    result.commit = commit?.url ?? null
  } catch (error) {
    console.error("health ingest failed", error)
    return json(502, { error: error instanceof Error ? error.message : String(error) })
  }

  console.log("health ingest", {
    automation: request.headers.get("automation-name"),
    period: request.headers.get("automation-period"),
    aggregation: request.headers.get("automation-aggregation"),
    ...result
  })
  return json(200, result)
}
