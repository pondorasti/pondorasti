import { readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vite-plus/test"
import { loadContent } from "./load"
import { itemCard, ogUrl } from "./og"

const content = loadContent(fileURLToPath(new URL("../../content", import.meta.url)))
const og = fileURLToPath(new URL("../../og", import.meta.url))

describe("Open Graph cards", () => {
  it("gives each card a URL that changes with what it shows", () => {
    const [item] = content.items
    expect(ogUrl(itemCard(item))).toBe(item.og)
    expect(ogUrl(itemCard({ ...item, name: `${item.name} 2` }))).not.toBe(item.og)
  })
  // Cards are drawn by `bun run images`, not the build, so a stale one fails here first.
  it("has every card committed to og/, and nothing else", () => {
    const committed = readdirSync(og).filter((file) => file.endsWith(".jpg"))
    const expected = [...content.cards.keys()].map((url) => path.basename(url))
    expect(expected.filter((file) => !committed.includes(file))).toEqual([])
    expect(committed.filter((file) => !expected.includes(file))).toEqual([])
  })
})
