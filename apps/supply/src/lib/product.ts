export interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
  href?: string
}

export interface ContentBlock {
  id: string
  type: string
  text: TextRun[]
  children: ContentBlock[]
  image?: string
  checked?: boolean
}

export interface ProductSummary {
  slug: string
  name: string
  ownership: string
  tags: string[]
  thumbnail: string | null
}

export interface ProductDetail extends ProductSummary {
  link: string | null
  body: ContentBlock[]
}

/** Catalog views, one per Notion ownership status. Supply is the default and carries no URL value. */
export const VIEWS = [
  { id: "supply", label: "Supply", ownership: "Owned" },
  { id: "wishlist", label: "Wishlist", ownership: "Wishlist" },
  { id: "retired", label: "Retired", ownership: "Retired" }
] as const
export type View = (typeof VIEWS)[number]["id"]

export const isView = (value: unknown): value is View => VIEWS.some((view) => view.id === value)

export const viewOwnership = (view: View = "supply") =>
  VIEWS.find(({ id }) => id === view)!.ownership

export const ownershipView = (ownership: string): View | undefined =>
  VIEWS.find((view) => view.ownership === ownership)?.id

export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9-]{1,150}$/.test(value)
