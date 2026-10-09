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
})
