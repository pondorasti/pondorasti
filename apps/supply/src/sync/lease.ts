import { and, eq, lte, sql } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import type { DrizzleD1Database } from "drizzle-orm/d1"
import { syncState } from "../db/schema"
import { SyncError, type Clock } from "./runtime"

const LEASE_MS = 180_000
const RENEW_AFTER_MS = 30_000
const RUN_BUDGET_MS = 12 * 60_000

export interface Lease {
  /** Matches the state row only while this run still holds the lease. */
  owned: ReturnType<typeof and>
  /** Renews the lease when due; throws once the run budget or the lease is gone. */
  heartbeat: () => Promise<void>
  /** First statement of the publication batch: aborts it unless the lease is still held. */
  guard: (now: number) => BatchItem<"sqlite">
  release: () => Promise<void>
}

export async function acquireLease(
  db: DrizzleD1Database,
  owner: string,
  started: number,
  clock: Clock
): Promise<Lease | null> {
  await db.insert(syncState).values({ id: 1 }).onConflictDoNothing()
  const [lease] = await db
    .update(syncState)
    .set({
      leaseOwner: owner,
      leaseUntil: started + LEASE_MS,
      fence: sql`${syncState.fence} + 1`
    })
    .where(and(eq(syncState.id, 1), lte(syncState.leaseUntil, started)))
    .returning({ fence: syncState.fence })
  if (!lease) return null
  const owned = and(
    eq(syncState.id, 1),
    eq(syncState.leaseOwner, owner),
    eq(syncState.fence, lease.fence)
  )
  let renewed = started

  return {
    owned,
    async heartbeat() {
      const now = clock.now()
      if (now - started > RUN_BUDGET_MS) throw new SyncError("sync_time_budget")
      if (now - renewed < RENEW_AFTER_MS) return
      const result = await db
        .update(syncState)
        .set({ leaseUntil: now + LEASE_MS })
        .where(and(owned, sql`${syncState.leaseUntil} > ${now}`))
        .returning({ id: syncState.id })
      if (!result.length) throw new SyncError("sync_lease_lost")
      renewed = now
    },
    guard(now) {
      // A failed CHECK aborts the entire D1 batch, even if the lease row was removed.
      // ON CONFLICT runs after CHECK, so a valid lease leaves the state row untouched.
      return db
        .insert(syncState)
        .values({
          id: 1,
          leaseUntil: sql`CASE WHEN EXISTS (
          SELECT 1 FROM sync_state WHERE id = 1 AND lease_owner = ${owner}
          AND fence = ${lease.fence} AND lease_until > ${now}
        ) THEN 0 ELSE -1 END`
        })
        .onConflictDoNothing()
    },
    async release() {
      await db.update(syncState).set({ leaseOwner: null, leaseUntil: 0 }).where(owned)
    }
  }
}
