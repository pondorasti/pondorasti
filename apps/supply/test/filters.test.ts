import { describe, expect, it } from "vite-plus/test"
import { filterCatalog, validateFilters } from "../src/lib/filters"
import type { ProductSummary } from "../src/lib/product"

const product = (name: string, ownership = "Owned", tags = ["Office"]): ProductSummary => ({
  name,
  ownership,
  tags,
  slug: name,
  thumbnail: null
})

describe("catalog URL filters", () => {
  it("rejects malformed URL values and bounds text input", () => {
    expect(validateFilters({ q: {}, tag: ["Office"], sort: "random", view: "Retired" })).toEqual({
      q: undefined,
      tag: undefined,
      sort: undefined,
      view: undefined
    })
    expect(validateFilters({ view: "supply" }).view).toBeUndefined()
    expect(validateFilters({ view: "retired" }).view).toBe("retired")
    expect(validateFilters({ q: "a".repeat(201) }).q).toHaveLength(200)
  })
  it("combines view, tag and case-insensitive search terms without mutating the source", () => {
    const products = [
      product("Keyboard 10"),
      product("Keyboard 2"),
      product("Keyboard 3", "Wishlist"),
      product("Keyboard 4", "Owned", ["Carry"]),
      product("Keyboard 5", "Retired")
    ]
    expect(filterCatalog(products, { q: "KEY office", tag: "Office" }).map((p) => p.name)).toEqual([
      "Keyboard 2",
      "Keyboard 10"
    ])
    expect(products[0].name).toBe("Keyboard 10")
    expect(filterCatalog(products, { view: "wishlist", sort: "desc" })).toEqual([products[2]])
    expect(filterCatalog(products, { view: "retired" })).toEqual([products[4]])
    expect(filterCatalog(products, { tag: "Missing" })).toEqual([])
  })
})
