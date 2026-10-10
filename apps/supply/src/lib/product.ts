import { z } from "zod/mini"

/** Item status, as written in each item's front matter. */
export const Status = z.enum(["owned", "wishlist", "retired"])
export type Status = z.infer<typeof Status>

/** Category tags, in display order. A new tag needs an entry here and an icon in `components/controls.tsx`. */
export const Tag = z.enum([
  "books",
  "technology",
  "office",
  "apparel",
  "shoes",
  "sunglasses",
  "watches",
  "carry",
  "bathroom",
  "bedroom",
  "skin",
  "oral"
])
export type Tag = z.infer<typeof Tag>

/** Display name for a status or tag id, e.g. "technology" → "Technology". */
export const label = (id: Status | Tag) => id[0].toUpperCase() + id.slice(1).replaceAll("-", " ")

/** An item's folder name and URL segment. */
export const Slug = z.string().check(z.maxLength(150), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))

export interface ProductSummary {
  slug: string
  name: string
  status: Status
  tags: Tag[]
  /** URL of the item's image, content-addressed so it can be cached forever. */
  image: string
}

export interface ProductDetail extends ProductSummary {
  link: string | null
  /** Notes rendered to HTML at build time from the item's markdown. */
  notes: string
}

/** Catalog views, one per status. Supply is the default and carries no URL value. */
export const VIEWS = [
  { id: "supply", label: "Supply", status: "owned" },
  { id: "wishlist", label: "Wishlist", status: "wishlist" },
  { id: "retired", label: "Retired", status: "retired" }
] as const satisfies { id: string; label: string; status: Status }[]
export type View = (typeof VIEWS)[number]["id"]

export const viewStatus = (view: View = "supply"): Status =>
  VIEWS.find(({ id }) => id === view)!.status

export const statusView = (status: Status): View => VIEWS.find((view) => view.status === status)!.id
