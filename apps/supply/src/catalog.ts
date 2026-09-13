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

export function safeLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export function imagePath(hash: string): string {
  return `/images/${hash}`
}
