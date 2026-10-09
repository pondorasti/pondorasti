import { isTag, isView, type ProductSummary, type Tag, type View, viewStatus } from "./product"

export interface CatalogFilters {
  q?: string
  tag?: Tag
  view?: Exclude<View, "supply">
}

export function validateFilters(search: Record<string, unknown>): CatalogFilters {
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 200) || undefined : undefined,
    tag: isTag(search.tag) ? search.tag : undefined,
    view: isView(search.view) && search.view !== "supply" ? search.view : undefined
  }
}

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
