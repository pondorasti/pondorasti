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
