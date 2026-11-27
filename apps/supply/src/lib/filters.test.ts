import { describe, expect, it } from "vite-plus/test"
import { CatalogFilters, filterCatalog, sectionsByGroup, sectionsByTag } from "./filters"
import type { Group, ProductSummary, Status, Tag } from "./product"

const product = (
  name: string,
  status: Status = "owned",
  tag: Tag = "office",
  group: Group | null = null,
  order: number | null = null
): ProductSummary => ({
  name,
  status,
  tag,
  group,
  order,
  slug: name,
  image: "/images/x.webp"
})

describe("catalog URL filters", () => {
  it("rejects malformed URL values and bounds text input", () => {
    expect(CatalogFilters.parse({ q: {}, tag: "Office", view: "Archive" })).toEqual({
      q: undefined,
      tag: undefined,
      view: undefined
    })
    expect(CatalogFilters.parse({ view: "collection" }).view).toBeUndefined()
    expect(CatalogFilters.parse({ view: "archive" }).view).toBe("archive")
    expect(CatalogFilters.parse({ tag: "office" }).tag).toBe("office")
    expect(CatalogFilters.parse({ tag: "skin" }).tag).toBe("bathroom")
    expect(CatalogFilters.parse({ tag: "oral" }).tag).toBe("bathroom")
    expect(CatalogFilters.parse({ tag: "shoes" }).tag).toBe("apparel")
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
    expect(filterCatalog(products, { view: "archive" })).toEqual([products[4]])
    expect(filterCatalog(products, { tag: "books" })).toEqual([])
  })
  it("splits products into tag sections in pill order without empty sections", () => {
    const products = [
      product("Notebook", "owned", "office"),
      product("Dune", "owned", "books"),
      product("Desk", "owned", "office")
    ]
    expect(sectionsByTag(products)).toEqual([
      { tag: "books", products: [products[1]] },
      { tag: "office", products: [products[0], products[2]] }
    ])
  })
  it("splits products into group sections with ungrouped items first", () => {
    const products = [
      product("Toothbrush", "owned", "bathroom", "oral"),
      product("Towel", "owned", "bathroom"),
      product("Serum", "owned", "bathroom", "skin")
    ]
    expect(sectionsByGroup(products)).toEqual([
      { group: null, products: [products[1]] },
      { group: "skin", products: [products[2]] },
      { group: "oral", products: [products[0]] }
    ])
    expect(filterCatalog(products, { q: "skin" })).toEqual([products[2]])
  })
  it("puts ordered items first within their group, lowest first, keeping the rest in order", () => {
    const products = [
      product("Detergent", "owned", "bathroom", "laundry"),
      product("Hamper", "owned", "bathroom", "laundry", 1),
      product("Iron", "owned", "bathroom", "laundry", 2),
      product("Ironing Board", "owned", "bathroom", "laundry"),
      product("Mesh Bags", "owned", "bathroom", "laundry", 2),
      product("Serum", "owned", "bathroom", "skin"),
      product("Toner", "owned", "bathroom", "skin", 1)
    ]
    expect(sectionsByGroup(products)).toEqual([
      { group: "skin", products: [products[6], products[5]] },
      {
        group: "laundry",
        products: [products[1], products[2], products[4], products[0], products[3]]
      }
    ])
    // Search results stay alphabetical; the source isn't mutated.
    expect(filterCatalog(products, { q: "o" })[0]).toBe(products[0])
    expect(products[1].name).toBe("Hamper")
  })
})
