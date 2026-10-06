import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const assets = sqliteTable("assets", {
  hash: text("hash").primaryKey(),
  key: text("key").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull()
})

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    link: text("link"),
    ownership: text("ownership").notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    thumbnail: text("thumbnail").references(() => assets.hash),
    body: text("body").notNull(),
    sourceProperties: text("source_properties").notNull(),
    sourceRevision: text("source_revision").notNull(),
    contentHash: text("content_hash").notNull(),
    updatedAt: integer("updated_at").notNull(),
    removedAt: integer("removed_at")
  },
  (table) => [index("products_visibility").on(table.removedAt, table.ownership)]
)

export const syncState = sqliteTable(
  "sync_state",
  {
    id: integer("id").primaryKey(),
    fence: integer("fence").notNull().default(0),
    leaseOwner: text("lease_owner"),
    leaseUntil: integer("lease_until").notNull().default(0),
    lastSuccess: integer("last_success"),
    lastRun: text("last_run")
  },
  (table) => [check("valid_lease", sql`${table.leaseUntil} >= 0`)]
)

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  status: text("status").notNull(),
  scanned: integer("scanned").notNull().default(0),
  changed: integer("changed").notNull().default(0),
  uploaded: integer("uploaded").notNull().default(0),
  error: text("error")
})
