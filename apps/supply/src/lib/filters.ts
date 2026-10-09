import { isView, type ProductSummary, type View, viewOwnership } from "./product"

export interface CatalogFilters {
  q?: string
  tag?: string
  view?: Exclude<View, "supply">
}

export function validateFilters(search: Record<string, unknown>): CatalogFilters {
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 200) || undefined : undefined,
    tag: typeof search.tag === "string" ? search.tag.slice(0, 100) || undefined : undefined,
    view: isView(search.view) && search.view !== "supply" ? search.view : undefined
  }
}

export function productsInView(products: ProductSummary[], view?: View) {
  const ownership = viewOwnership(view)
  return products.filter((product) => product.ownership === ownership)
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
