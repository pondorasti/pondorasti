import { and, eq, isNull, lt, sql } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import type { DrizzleD1Database } from "drizzle-orm/d1"
import { assets, products, syncRuns, syncState } from "../db/schema"
import type { Asset } from "./assets/store"
import type { Lease } from "./lease"
import type { Product } from "./plan"
import { SyncError } from "./runtime"

const MAX_STATEMENTS = 900
const RUN_RETENTION_MS = 14 * 86400_000

export interface Publication {
  runId: string
  now: number
  assets: Asset[]
  updates: Product[]
  /** Every live Notion row id from the complete scan; anything else is tombstoned. */
  seen: string[]
  counts: { scanned: number; changed: number; uploaded: number }
}

/** Applies the whole update in one D1 batch, which rolls back entirely if the lease was lost. */
export async function publish(db: DrizzleD1Database, lease: Lease, publication: Publication) {
  const { runId, now, updates, seen, counts } = publication
  const writes: BatchItem<"sqlite">[] = []
  for (let i = 0; i < publication.assets.length; i += 20) {
    writes.push(
      db
        .insert(assets)
        .values(publication.assets.slice(i, i + 20))
        .onConflictDoNothing()
    )
  }
  for (const product of updates) {
    writes.push(
      db.insert(products).values(product).onConflictDoUpdate({ target: products.id, set: product })
    )
  }
  writes.push(
    db
      .update(products)
      .set({ removedAt: now })
      .where(
        and(
          isNull(products.removedAt),
          sql`${products.id} NOT IN (SELECT value FROM json_each(${JSON.stringify(seen)}))`
        )
      ),
    db
      .update(syncRuns)
      .set({ status: "succeeded", finishedAt: now, ...counts })
      .where(eq(syncRuns.id, runId)),
    db
      .update(syncState)
      .set({ lastSuccess: now, lastRun: runId, leaseOwner: null, leaseUntil: 0 })
      .where(lease.owned),
    db.delete(syncRuns).where(lt(syncRuns.finishedAt, now - RUN_RETENTION_MS))
  )
  if (writes.length > MAX_STATEMENTS) throw new SyncError("publication_query_limit")
  await db.batch([lease.guard(now), ...writes])
}
