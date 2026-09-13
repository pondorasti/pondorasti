import { describe, expect, it } from "vitest"
import { filterCatalog, validateFilters } from "../src/filters"
import type { ProductSummary } from "../src/catalog"

const product = (name: string, ownership = "Owned", tags = ["Office"]): ProductSummary => ({
  name,
  ownership,
  tags,
  slug: name,
  thumbnail: null
})

describe("catalog URL filters", () => {
  it("rejects malformed URL values and bounds text input", () => {
    expect(
      validateFilters({ q: {}, tag: ["Office"], sort: "random", ownership: "Retired" })
    ).toEqual({ q: undefined, tag: undefined, sort: undefined, ownership: undefined })
    expect(validateFilters({ q: "a".repeat(201) }).q).toHaveLength(200)
  })
  it("combines tag, ownership and case-insensitive search terms without mutating the source", () => {
    const products = [
      product("Keyboard 10"),
      product("Keyboard 2"),
      product("Keyboard 3", "Wishlist"),
      product("Keyboard 4", "Owned", ["Carry"])
    ]
    expect(
      filterCatalog(products, { q: "KEY office", ownership: "Owned", tag: "Office" }).map(
        (p) => p.name
      )
    ).toEqual(["Keyboard 2", "Keyboard 10"])
    expect(products[0].name).toBe("Keyboard 10")
    expect(filterCatalog(products, { ownership: "Wishlist", sort: "desc" })).toEqual([products[2]])
    expect(filterCatalog(products, { tag: "Missing" })).toEqual([])
  })
})
