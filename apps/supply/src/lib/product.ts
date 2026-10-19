import { z } from "zod/mini"

/** Item status, as written in each item's front matter. */
export const Status = z.enum(["owned", "wishlist", "retired"])
export type Status = z.infer<typeof Status>

/** Categories, in display order; each item has exactly one. A new one needs an entry here and an icon in `components/controls.tsx`. */
export const Tag = z.enum([
  "books",
  "technology",
  "office",
  "apparel",
  "carry",
  "bedroom",
  "bathroom",
  "supplements"
])
export type Tag = z.infer<typeof Tag>

/** Sub groups, in display order. Each belongs to one tag in `TAG_GROUPS` and needs an icon in `components/controls.tsx`. */
export const Group = z.enum([
  "outerwear",
  "layers",
  "knitwear",
  "shirts",
  "tees",
  "bottoms",
  "basics",
  "shoes",
  "sunglasses",
  "watches",
  "accessories",
  "skin",
  "oral",
  "towels",
  "hair",
  "laundry",
  "bed",
  "bedding",
  "vitamins",
  "workout"
])
export type Group = z.infer<typeof Group>

/** The sub groups an item with this tag may use; tags without an entry have none. */
export const TAG_GROUPS: Partial<Record<Tag, Group[]>> = {
  apparel: [
    "outerwear",
    "layers",
    "knitwear",
    "shirts",
    "tees",
    "bottoms",
    "basics",
    "shoes",
    "sunglasses",
    "watches",
    "accessories"
  ],
  bathroom: ["skin", "oral", "towels", "hair", "laundry"],
  bedroom: ["bed", "bedding"],
  supplements: ["vitamins", "workout"]
}

/** Display name for a status, tag or group id, e.g. "technology" → "Technology". */
export const label = (id: Status | Tag | Group) =>
  id[0].toUpperCase() + id.slice(1).replaceAll("-", " ")

/** An item's folder name and URL segment. */
export const Slug = z.string().check(z.maxLength(150), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))

export interface ProductSummary {
  slug: string
  name: string
  status: Status
  tag: Tag
  /** Optional sub group within the tag, e.g. bathroom → skin. */
  group: Group | null
  /** URL of the item's image, content-addressed so it can be cached forever. */
  image: string
}

export interface ProductDetail extends ProductSummary {
  /** Color, size or edition, shown under the name on the item page. */
  variant: string | null
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
