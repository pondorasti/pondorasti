import type { ProductSummary } from "./catalog"

export interface CatalogFilters {
  q?: string
  tag?: string
  ownership?: "Owned" | "Wishlist"
  sort?: "desc"
}

export function validateFilters(search: Record<string, unknown>): CatalogFilters {
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 200) || undefined : undefined,
    tag: typeof search.tag === "string" ? search.tag.slice(0, 100) || undefined : undefined,
    ownership:
      search.ownership === "Owned" || search.ownership === "Wishlist"
        ? search.ownership
        : undefined,
    sort: search.sort === "desc" ? "desc" : undefined
  }
}

export function filterCatalog(products: ProductSummary[], filters: CatalogFilters) {
  const terms = (filters.q ?? "").trim().toLocaleLowerCase("en").split(/\s+/).filter(Boolean)
  return products
    .filter((product) => {
      const text = `${product.name} ${product.tags.join(" ")}`.toLocaleLowerCase("en")
      return (
        (!filters.ownership || product.ownership === filters.ownership) &&
        (!filters.tag || product.tags.includes(filters.tag)) &&
        terms.every((term) => text.includes(term))
      )
    })
    .sort(
      (a, b) =>
        (filters.sort === "desc" ? -1 : 1) *
        a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" })
    )
}
