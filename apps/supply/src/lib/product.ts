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

/** Notion statuses visitors can filter by. Others are mirrored as-is; Retired is never public. */
export const OWNERSHIPS = ["Owned", "Wishlist"] as const
export type Ownership = (typeof OWNERSHIPS)[number]
export const RETIRED = "Retired"

export const isOwnership = (value: unknown): value is Ownership =>
  OWNERSHIPS.some((ownership) => ownership === value)

export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9-]{1,150}$/.test(value)
