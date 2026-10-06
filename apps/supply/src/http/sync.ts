import { timingSafeEqual } from "node:crypto"
import { desc } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { syncRuns, syncState } from "../db/schema"
import { runSync, type SupplyEnv, type SyncOptions } from "../sync"
import { SyncError } from "../sync/runtime"
import { json } from "./responses"

function authorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false
  const expected = new TextEncoder().encode(`Bearer ${secret}`)
  const received = new TextEncoder().encode(request.headers.get("Authorization") ?? "")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function handleSync(request: Request, env: SupplyEnv, options: SyncOptions) {
  if (!authorized(request, env.SYNC_SECRET)) return json({ error: "unauthorized" }, 401)
  if (request.method === "GET") {
    const db = drizzle(env.DB)
    const state = await db
      .select({ lastSuccess: syncState.lastSuccess, lastRun: syncState.lastRun })
      .from(syncState)
    const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(20)
    return json({ state: state[0] ?? null, runs })
  }
  const force = new URL(request.url).searchParams.get("force") === "1"
  try {
    return json(await runSync(env, { ...options, force }))
  } catch (error) {
    return json({ error: error instanceof SyncError ? error.code : "sync_failed" }, 503)
  }
}
