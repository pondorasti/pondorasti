import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import type { ProductDetail } from "../lib/product"
import { parseItem } from "./parse"

export interface Content {
  items: ProductDetail[]
  /** Public image URL to the file it serves. */
  images: Map<string, string>
}

/** Reads every `content/<slug>/` folder; throws once, listing every invalid item. */
export function loadContent(dir: string): Content {
  const items: ProductDetail[] = []
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
      items.push(parseItem(slug, readFileSync(path.join(folder, "index.md"), "utf8"), resolve))
    } catch (error) {
      errors.push(`content/${slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (errors.length) throw new Error(`Invalid content:\n${errors.join("\n")}`)
  items.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }))
  return { items, images }
}
