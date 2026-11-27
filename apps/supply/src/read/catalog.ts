import { items } from "virtual:supply-content"
import type { ProductDetail, ProductSummary } from "../lib/product"

export const getCatalog = (): ProductSummary[] =>
  items.map(({ slug, name, status, tag, group, order, image }) => ({
    slug,
    name,
    status,
    tag,
    group,
    order,
    image
  }))

export const getProduct = (slug: string): ProductDetail | null =>
  items.find((item) => item.slug === slug) ?? null
