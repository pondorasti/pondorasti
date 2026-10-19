import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vite-plus/test"
import { loadContent } from "./load"

describe("repo content", () => {
  it("loads every item with a unique slug and a served image", () => {
    const { items, images } = loadContent(fileURLToPath(new URL("../../content", import.meta.url)))
    expect(items.length).toBeGreaterThan(0)
    expect(new Set(items.map((product) => product.slug)).size).toBe(items.length)
    for (const product of items) expect(images.has(product.image)).toBe(true)
  })
  it("gives every item and view an Open Graph card", () => {
    const { items, views, cards } = loadContent(
      fileURLToPath(new URL("../../content", import.meta.url))
    )
    for (const url of [...items.map((product) => product.og), ...Object.values(views)]) {
      expect(cards.has(url)).toBe(true)
    }
  })
})
