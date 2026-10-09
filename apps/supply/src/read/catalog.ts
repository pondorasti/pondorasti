import { items } from "virtual:supply-content"
import type { ProductDetail, ProductSummary } from "../lib/product"

export const getCatalog = (): ProductSummary[] =>
  items.map(({ slug, name, status, tags, image }) => ({ slug, name, status, tags, image }))

export const getProduct = (slug: string): ProductDetail | null =>
  items.find((item) => item.slug === slug) ?? null
