import { describe, expect, it } from "vite-plus/test"
import { CatalogFilters, filterCatalog } from "./filters"
import type { ProductSummary, Status, Tag } from "./product"

const product = (name: string, status: Status = "owned", tag: Tag = "office"): ProductSummary => ({
  name,
  status,
  tag,
  slug: name,
  image: "/images/x.webp"
})

describe("catalog URL filters", () => {
  it("rejects malformed URL values and bounds text input", () => {
    expect(CatalogFilters.parse({ q: {}, tag: "Office", view: "Retired" })).toEqual({
      q: undefined,
      tag: undefined,
      view: undefined
    })
    expect(CatalogFilters.parse({ view: "supply" }).view).toBeUndefined()
    expect(CatalogFilters.parse({ view: "retired" }).view).toBe("retired")
    expect(CatalogFilters.parse({ tag: "office" }).tag).toBe("office")
    expect(CatalogFilters.parse({ q: "a".repeat(201) }).q).toHaveLength(200)
  })
  it("combines view, tag and case-insensitive search terms without mutating the source", () => {
    const products = [
      product("Keyboard 10"),
      product("Keyboard 2"),
      product("Keyboard 3", "wishlist"),
      product("Keyboard 4", "owned", "carry"),
      product("Keyboard 5", "retired")
    ]
    expect(filterCatalog(products, { q: "KEY office", tag: "office" }).map((p) => p.name)).toEqual([
      "Keyboard 2",
      "Keyboard 10"
    ])
    expect(products[0].name).toBe("Keyboard 10")
    expect(filterCatalog(products, { view: "wishlist" })).toEqual([products[2]])
    expect(filterCatalog(products, { view: "retired" })).toEqual([products[4]])
    expect(filterCatalog(products, { tag: "books" })).toEqual([])
  })
})
