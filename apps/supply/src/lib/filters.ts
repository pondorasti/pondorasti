import { z } from "zod/mini"
import { Group, type ProductSummary, Tag, type View, viewStatus } from "./product"

const FOLDED_TAGS = {
  shoes: "apparel",
  sunglasses: "apparel",
  watches: "apparel",
  skin: "bathroom",
  oral: "bathroom"
} as const satisfies Record<string, Tag>

/** Catalog URL search params. Malformed values are dropped rather than failing the page. */
export const CatalogFilters = z.object({
  q: z.catch(
    z.optional(
      z.pipe(
        z.string(),
        z.transform((q) => q.slice(0, 200) || undefined)
      )
    ),
    undefined
  ),
  // Tags that became groups send old links to their new tag.
  tag: z.catch(
    z.optional(
      z.union([
        Tag,
        z.pipe(
          z.enum(["shoes", "sunglasses", "watches", "skin", "oral"]),
          z.transform((tag) => FOLDED_TAGS[tag])
        )
      ])
    ),
    undefined
  ),
  // Owned is the default view, so it never appears in the URL.
  view: z.catch(z.optional(z.enum(["wishlist", "retired"])), undefined)
})
export type CatalogFilters = z.output<typeof CatalogFilters>

export function productsInView(products: ProductSummary[], view?: View) {
  const status = viewStatus(view)
  return products.filter((product) => product.status === status)
}

export function filterCatalog(products: ProductSummary[], filters: CatalogFilters) {
  const terms = (filters.q ?? "").trim().toLocaleLowerCase("en").split(/\s+/).filter(Boolean)
  return productsInView(products, filters.view)
    .filter((product) => {
      const text = `${product.name} ${product.tag} ${product.group ?? ""}`.toLocaleLowerCase("en")
      return (
        (!filters.tag || product.tag === filters.tag) && terms.every((term) => text.includes(term))
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }))
}

/** Splits products into per-tag sections in pill order, keeping each section's order and skipping empty tags. */
export function sectionsByTag(products: ProductSummary[]) {
  return Tag.options
    .map((tag) => ({ tag, products: products.filter((product) => product.tag === tag) }))
    .filter((section) => section.products.length)
}

/** Splits products into per-group sections: ungrouped first, then groups in display order, skipping empty ones. */
export function sectionsByGroup(products: ProductSummary[]) {
  return [null, ...Group.options]
    .map((group) => ({ group, products: products.filter((product) => product.group === group) }))
    .filter((section) => section.products.length)
}
