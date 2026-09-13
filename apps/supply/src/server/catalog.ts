import { and, asc, eq, isNull, ne } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import type { ProductDetail, ProductSummary } from "../catalog"
import { products } from "./schema"

const visible = and(isNull(products.removedAt), ne(products.ownership, "Retired"))
const summary = {
  slug: products.slug,
  name: products.name,
  ownership: products.ownership,
  tags: products.tags,
  thumbnail: products.thumbnail
}

export async function getCatalog(database: D1Database): Promise<ProductSummary[]> {
  return drizzle(database).select(summary).from(products).where(visible).orderBy(asc(products.name))
}

export async function getProduct(
  database: D1Database,
  slug: string
): Promise<ProductDetail | null> {
  const [product] = await drizzle(database)
    .select({ ...summary, body: products.body, link: products.link })
    .from(products)
    .where(and(visible, eq(products.slug, slug)))
    .limit(1)
  return product ? { ...product, body: JSON.parse(product.body) } : null
}
