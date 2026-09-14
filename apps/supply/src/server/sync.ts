import { and, eq, isNull, lt, lte, sql } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { drizzle } from "drizzle-orm/d1"
import type { ContentBlock } from "../catalog"
import { AssetStore } from "./assets"
import { NotionSource, type NotionOptions, type SourceBlock } from "./notion"
import { sha256, SyncError, systemClock, type HttpFetch } from "./runtime"
import { assets, products, syncRuns, syncState } from "./schema"

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

const LEASE_MS = 180_000
const RUN_BUDGET_MS = 12 * 60_000
type Product = typeof products.$inferSelect

export async function runSync(env: SupplyEnv, options: SyncOptions = {}) {
  if (!env.NOTION_TOKEN) throw new SyncError("notion_token_missing")
  const clock = options.clock ?? systemClock
  const db = drizzle(env.DB)
  const id = crypto.randomUUID()
  const started = clock.now()
  await db.insert(syncState).values({ id: 1 }).onConflictDoNothing()
  const [lease] = await db
    .update(syncState)
    .set({
      leaseOwner: id,
      leaseUntil: started + LEASE_MS,
      fence: sql`${syncState.fence} + 1`
    })
    .where(and(eq(syncState.id, 1), lte(syncState.leaseUntil, started)))
    .returning({ fence: syncState.fence })
  if (!lease) return { status: "skipped" as const, scanned: 0, changed: 0, uploaded: 0 }
  const owned = and(
    eq(syncState.id, 1),
    eq(syncState.leaseOwner, id),
    eq(syncState.fence, lease.fence)
  )
  let renewed = started
  let scanned = 0
  let changed = 0
  let uploaded = 0

  async function heartbeat() {
    const now = clock.now()
    if (now - started > RUN_BUDGET_MS) throw new SyncError("sync_time_budget")
    if (now - renewed < 30_000) return
    const result = await db
      .update(syncState)
      .set({ leaseUntil: now + LEASE_MS })
      .where(and(owned, sql`${syncState.leaseUntil} > ${now}`))
      .returning({ id: syncState.id })
    if (!result.length) throw new SyncError("sync_lease_lost")
    renewed = now
  }

  try {
    await db.insert(syncRuns).values({ id, startedAt: started, status: "running" })
    const source = new NotionSource(env.NOTION_TOKEN, env.NOTION_DATA_SOURCE_ID, {
      ...options,
      checkpoint: heartbeat
    })
    const rows = await source.scan()
    scanned = rows.length
    await heartbeat()
    const existing = new Map(
      (await db.select().from(products)).map((product) => [product.id, product])
    )
    const images = new AssetStore(env.IMAGES, source, await db.select().from(assets), {
      fetch: options.imageFetch,
      clock,
      allowedHosts: env.IMAGE_ALLOWED_HOSTS?.split(",")
        .map((host) => host.trim())
        .filter(Boolean)
    })
    const updates: Product[] = []
    let snapshotBytes = 0

    async function copyBody(blocks: SourceBlock[]): Promise<ContentBlock[]> {
      const result: ContentBlock[] = []
      for (const { file, children, ...block } of blocks) {
        await heartbeat()
        const image = file ? await images.copy(file) : undefined
        result.push({ ...block, children: await copyBody(children), ...(image && { image }) })
      }
      return result
    }

    for (const row of rows) {
      await heartbeat()
      const previous = existing.get(row.id)
      if (!options.force && previous?.sourceRevision === row.revision) {
        if (previous.removedAt !== null)
          updates.push({ ...previous, removedAt: null, updatedAt: clock.now() })
        continue
      }
      const body = JSON.stringify(await copyBody(await source.body(row.id)))
      const thumbnail = row.thumbnail ? await images.copy(row.thumbnail) : null
      const contentHash = await sha256(
        JSON.stringify([row.name, row.link, row.ownership, row.tags, thumbnail, body])
      )
      snapshotBytes += new TextEncoder().encode(body + row.properties).byteLength
      if (snapshotBytes > 24 * 1024 * 1024 || body.length + row.properties.length > 500_000)
        throw new SyncError("catalog_size_limit")
      const nameSlug =
        row.name
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80) || "item"
      updates.push({
        id: row.id,
        slug: previous?.slug ?? `${nameSlug}-${(await sha256(row.id)).slice(0, 12)}`,
        name: row.name,
        link: row.link,
        ownership: row.ownership,
        tags: row.tags,
        thumbnail,
        body,
        sourceProperties: row.properties,
        sourceRevision: row.revision,
        contentHash,
        updatedAt: clock.now(),
        removedAt: null
      })
    }

    await heartbeat()
    changed = updates.length
    uploaded = images.uploaded
    const now = clock.now()
    // A failed CHECK aborts the entire D1 batch, even if the lease row was removed.
    // ON CONFLICT runs after CHECK, so a valid lease leaves the state row untouched.
    const guard = db
      .insert(syncState)
      .values({
        id: 1,
        leaseUntil: sql`CASE WHEN EXISTS (
        SELECT 1 FROM sync_state WHERE id = 1 AND lease_owner = ${id}
        AND fence = ${lease.fence} AND lease_until > ${now}
      ) THEN 0 ELSE -1 END`
      })
      .onConflictDoNothing()
    const writes: BatchItem<"sqlite">[] = []
    for (let i = 0; i < images.added.length; i += 20) {
      writes.push(
        db
          .insert(assets)
          .values(images.added.slice(i, i + 20))
          .onConflictDoNothing()
      )
    }
    for (const product of updates) {
      writes.push(
        db
          .insert(products)
          .values(product)
          .onConflictDoUpdate({ target: products.id, set: product })
      )
    }
    writes.push(
      db
        .update(products)
        .set({ removedAt: now })
        .where(
          and(
            isNull(products.removedAt),
            sql`${products.id} NOT IN (SELECT value FROM json_each(${JSON.stringify(rows.map((row) => row.id))}))`
          )
        ),
      db
        .update(syncRuns)
        .set({ status: "succeeded", finishedAt: now, scanned, changed, uploaded })
        .where(eq(syncRuns.id, id)),
      db
        .update(syncState)
        .set({ lastSuccess: now, lastRun: id, leaseOwner: null, leaseUntil: 0 })
        .where(owned),
      db.delete(syncRuns).where(lt(syncRuns.finishedAt, now - 14 * 86400_000))
    )
    if (writes.length > 900) throw new SyncError("publication_query_limit")
    await db.batch([guard, ...writes])
    return { status: "succeeded" as const, scanned, changed, uploaded }
  } catch (error) {
    const code = error instanceof SyncError ? error.code : "sync_failed"
    await db
      .update(syncRuns)
      .set({ status: "failed", finishedAt: clock.now(), scanned, changed, uploaded, error: code })
      .where(eq(syncRuns.id, id))
    throw new SyncError(code)
  } finally {
    await db.update(syncState).set({ leaseOwner: null, leaseUntil: 0 }).where(owned)
  }
}
