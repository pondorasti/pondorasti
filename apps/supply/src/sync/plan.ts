import type { products } from "../db/schema"
import type { SourceProduct } from "./notion/map"
import { sha256, SyncError, type Clock } from "./runtime"

export type Product = typeof products.$inferSelect

const MAX_SNAPSHOT_BYTES = 24 * 1024 * 1024
const MAX_PRODUCT_CHARS = 500_000

export interface PlanOptions {
  force?: boolean
  clock: Clock
  checkpoint: () => Promise<void>
  /** Fetches a changed row's body and images; returns the serialized body and thumbnail hash. */
  copy: (row: SourceProduct) => Promise<{ body: string; thumbnail: string | null }>
}

/** Rows to upsert: changed or new rows with fresh content, and unchanged rows being restored. */
export async function planUpdates(
  rows: SourceProduct[],
  existing: Product[],
  options: PlanOptions
): Promise<Product[]> {
  const previousById = new Map(existing.map((product) => [product.id, product]))
  const updates: Product[] = []
  let snapshotBytes = 0

  for (const row of rows) {
    await options.checkpoint()
    const previous = previousById.get(row.id)
    if (!options.force && previous?.sourceRevision === row.revision) {
      if (previous.removedAt !== null)
        updates.push({ ...previous, removedAt: null, updatedAt: options.clock.now() })
      continue
    }
    const { body, thumbnail } = await options.copy(row)
    const contentHash = await sha256(
      JSON.stringify([row.name, row.link, row.ownership, row.tags, thumbnail, body])
    )
    snapshotBytes += new TextEncoder().encode(body + row.properties).byteLength
    if (
      snapshotBytes > MAX_SNAPSHOT_BYTES ||
      body.length + row.properties.length > MAX_PRODUCT_CHARS
    )
      throw new SyncError("catalog_size_limit")
    updates.push({
      id: row.id,
      slug: previous?.slug ?? (await slugFor(row.name, row.id)),
      name: row.name,
      link: row.link,
      ownership: row.ownership,
      tags: row.tags,
      thumbnail,
      body,
      sourceProperties: row.properties,
      sourceRevision: row.revision,
      contentHash,
      updatedAt: options.clock.now(),
      removedAt: null
    })
  }
  return updates
}

/** A readable, collision-free slug; only assigned once, so title edits keep the URL. */
export async function slugFor(name: string, id: string): Promise<string> {
  const readable =
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "item"
  return `${readable}-${(await sha256(id)).slice(0, 12)}`
}
