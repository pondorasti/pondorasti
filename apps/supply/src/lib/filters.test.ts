import { describe, expect, it } from "vite-plus/test"
import { filterCatalog, validateFilters } from "./filters"
import type { ProductSummary, Status, Tag } from "./product"

const product = (
  name: string,
  status: Status = "owned",
  tags: Tag[] = ["office"]
): ProductSummary => ({
  name,
  status,
  tags,
  slug: name,
  image: "/images/x.webp"
})

describe("catalog URL filters", () => {
  it("rejects malformed URL values and bounds text input", () => {
    expect(validateFilters({ q: {}, tag: "Office", view: "Retired" })).toEqual({
      q: undefined,
      tag: undefined,
      view: undefined
    })
    expect(validateFilters({ view: "supply" }).view).toBeUndefined()
    expect(validateFilters({ view: "retired" }).view).toBe("retired")
    expect(validateFilters({ tag: "office" }).tag).toBe("office")
    expect(validateFilters({ q: "a".repeat(201) }).q).toHaveLength(200)
  })
  it("combines view, tag and case-insensitive search terms without mutating the source", () => {
    const products = [
      product("Keyboard 10"),
      product("Keyboard 2"),
      product("Keyboard 3", "wishlist"),
      product("Keyboard 4", "owned", ["carry"]),
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
