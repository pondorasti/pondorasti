import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { assets, products, syncRuns } from "../db/schema"
import type { ContentBlock } from "../lib/product"
import { AssetStore } from "./assets/store"
import { acquireLease } from "./lease"
import { NotionSource, type NotionOptions } from "./notion/client"
import type { SourceBlock } from "./notion/map"
import { planUpdates } from "./plan"
import { publish } from "./publish"
import { SyncError, systemClock, type HttpFetch } from "./runtime"

export interface SupplyEnv {
  DB: D1Database
  IMAGES: R2Bucket
  NOTION_DATA_SOURCE_ID: string
  PUBLIC_ORIGIN: string
  NOTION_TOKEN?: string
  SYNC_SECRET?: string
  IMAGE_ALLOWED_HOSTS?: string
}

export interface SyncOptions extends NotionOptions {
  imageFetch?: HttpFetch
  force?: boolean
}

export async function runSync(env: SupplyEnv, options: SyncOptions = {}) {
  if (!env.NOTION_TOKEN) throw new SyncError("notion_token_missing")
  const clock = options.clock ?? systemClock
  const db = drizzle(env.DB)
  const id = crypto.randomUUID()
  const started = clock.now()
  const lease = await acquireLease(db, id, started, clock)
  if (!lease) return { status: "skipped" as const, scanned: 0, changed: 0, uploaded: 0 }
  const { heartbeat } = lease
  let scanned = 0
  let changed = 0
  let uploaded = 0

  try {
    await db.insert(syncRuns).values({ id, startedAt: started, status: "running" })
    const source = new NotionSource(env.NOTION_TOKEN, env.NOTION_DATA_SOURCE_ID, {
      ...options,
      checkpoint: heartbeat
    })
    const rows = await source.scan()
    scanned = rows.length
    await heartbeat()
    const images = new AssetStore(env.IMAGES, source, await db.select().from(assets), {
      fetch: options.imageFetch,
      clock,
      allowedHosts: env.IMAGE_ALLOWED_HOSTS?.split(",")
        .map((host) => host.trim())
        .filter(Boolean)
    })

    async function copyBody(blocks: SourceBlock[]): Promise<ContentBlock[]> {
      const result: ContentBlock[] = []
      for (const { file, children, ...block } of blocks) {
        await heartbeat()
        const image = file ? await images.copy(file) : undefined
        result.push({ ...block, children: await copyBody(children), ...(image && { image }) })
      }
      return result
    }

    const updates = await planUpdates(rows, await db.select().from(products), {
      force: options.force,
      clock,
      checkpoint: heartbeat,
      copy: async (row) => ({
        body: JSON.stringify(await copyBody(await source.body(row.id))),
        thumbnail: row.thumbnail ? await images.copy(row.thumbnail) : null
      })
    })
    await heartbeat()
    changed = updates.length
    uploaded = images.uploaded
    await publish(db, lease, {
      runId: id,
      now: clock.now(),
      assets: images.added,
      updates,
      seen: rows.map((row) => row.id),
      counts: { scanned, changed, uploaded }
    })
    return { status: "succeeded" as const, scanned, changed, uploaded }
  } catch (error) {
    const code = error instanceof SyncError ? error.code : "sync_failed"
    await db
      .update(syncRuns)
      .set({ status: "failed", finishedAt: clock.now(), scanned, changed, uploaded, error: code })
      .where(eq(syncRuns.id, id))
    throw new SyncError(code)
  } finally {
    await lease.release()
  }
}

export async function scheduledSync(env: SupplyEnv, options: SyncOptions = {}) {
  const result = await runSync(env, options)
  console.info(JSON.stringify({ event: "supply_sync", ...result }))
}
