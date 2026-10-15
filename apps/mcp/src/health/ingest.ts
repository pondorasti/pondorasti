import { secretMatches } from "../login"
import { saveExport } from "./db"
import { parseExport } from "./parse"

export const INGEST_PATH = "/health/ingest"

/**
 * POST target for Health Auto Export's REST API automation, authenticated with
 * `Authorization: Bearer <HEALTH_INGEST_TOKEN>`. Safe to retry: rows upsert on their key.
 */
export async function ingestHealth(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } }
    )
  }
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!(await secretMatches(token, env.HEALTH_INGEST_TOKEN))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let parsed
  try {
    parsed = parseExport(await request.json())
  } catch (error) {
    const message = error instanceof SyntaxError ? "Body is not JSON" : String(error)
    return Response.json({ error: message }, { status: 400 })
  }

  const written = await saveExport(env.DB, parsed.samples, parsed.workouts)
  const received = { samples: parsed.samples.length, workouts: parsed.workouts.length }
  console.log("health ingest", {
    automation: request.headers.get("automation-name"),
    received,
    written,
    skipped: parsed.skipped
  })
  return Response.json({ received, written, skipped: parsed.skipped })
}
