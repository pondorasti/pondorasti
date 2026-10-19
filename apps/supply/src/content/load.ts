import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { type ProductDetail, VIEWS, type View } from "../lib/product"
import { itemCard, type OgCard, ogUrl, viewCard } from "./og"
import { parseItem } from "./parse"

export interface Content {
  items: ProductDetail[]
  /** Public image URL to the file it serves. */
  images: Map<string, string>
  /** Open Graph card URL for each view. */
  views: Record<View, string>
  /** Public Open Graph card URL to what it shows; cards are rendered when served or built. */
  cards: Map<string, OgCard>
}

/** Reads every `content/<slug>/` folder; throws once, listing every invalid item. */
export function loadContent(dir: string): Content {
  const parsed: Omit<ProductDetail, "og">[] = []
  const images = new Map<string, string>()
  const errors: string[] = []
  const folders = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  for (const { name: slug } of folders) {
    const folder = path.join(dir, slug)
    const resolve = (file: string) => {
      const source = path.join(folder, file)
      if (!/^[\w-]+\.webp$/.test(file) || !existsSync(source)) return undefined
      const hash = createHash("sha256").update(readFileSync(source)).digest("hex").slice(0, 16)
      images.set(`/images/${hash}.webp`, source)
      return `/images/${hash}.webp`
    }
    try {
      parsed.push(parseItem(slug, readFileSync(path.join(folder, "index.md"), "utf8"), resolve))
    } catch (error) {
      errors.push(`content/${slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (errors.length) throw new Error(`Invalid content:\n${errors.join("\n")}`)
  parsed.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }))
  const cards = new Map<string, OgCard>()
  const card = (spec: OgCard) => {
    const url = ogUrl(spec)
    cards.set(url, spec)
    return url
  }
  const items = parsed.map((item) => ({ ...item, og: card(itemCard(item)) }))
  const views = Object.fromEntries(VIEWS.map(({ id }) => [id, card(viewCard(id, items))]))
  return { items, images, views: views as Record<View, string>, cards }
}
