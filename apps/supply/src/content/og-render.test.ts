import { fileURLToPath } from "node:url"
import sharp from "sharp"
import { describe, expect, it } from "vite-plus/test"
import { loadContent } from "./load"
import { renderCard } from "./og-render"

const content = loadContent(fileURLToPath(new URL("../../content", import.meta.url)))
const resolve = (url: string) => content.images.get(url)

describe("Open Graph cards", () => {
  it("renders item and view cards as 1200×630 JPEGs", async () => {
    for (const url of [content.items[0].og, content.views.collection]) {
      const jpeg = await renderCard(content.cards.get(url)!, resolve)
      expect(await sharp(jpeg).metadata()).toMatchObject({
        format: "jpeg",
        width: 1200,
        height: 630
      })
    }
  })
  it("fails loudly on an image it can't find", async () => {
    await expect(
      renderCard(
        { kind: "item", eyebrow: "Office", title: "Lamp", image: "/images/x.webp" },
        resolve
      )
    ).rejects.toThrow("/images/x.webp")
  })
})
