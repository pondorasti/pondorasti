/** Item status, as written in each item's front matter. */
export const STATUSES = { owned: "Owned", wishlist: "Wishlist", retired: "Retired" } as const
export type Status = keyof typeof STATUSES

/** Category tags. A new tag needs an entry here and an icon in `components/controls.tsx`. */
export const TAGS = {
  apparel: "Apparel",
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  books: "Books",
  carry: "Carry",
  office: "Office",
  oral: "Oral",
  shoes: "Shoes",
  skin: "Skin",
  sunglasses: "Sunglasses",
  technology: "Technology",
  watches: "Watches"
} as const
export type Tag = keyof typeof TAGS

export const isTag = (value: unknown): value is Tag => typeof value === "string" && value in TAGS

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

export const isView = (value: unknown): value is View => VIEWS.some((view) => view.id === value)

export const viewStatus = (view: View = "supply"): Status =>
  VIEWS.find(({ id }) => id === view)!.status

export const statusView = (status: Status): View => VIEWS.find((view) => view.status === status)!.id

export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 150
