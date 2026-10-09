import { z } from "zod/mini"
import { type ProductSummary, Tag, type View, viewStatus } from "./product"

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
  tag: z.catch(z.optional(Tag), undefined),
  // Supply is the default view, so it never appears in the URL.
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
      const text = `${product.name} ${product.tags.join(" ")}`.toLocaleLowerCase("en")
      return (
        (!filters.tag || product.tags.includes(filters.tag)) &&
        terms.every((term) => text.includes(term))
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }))
}
