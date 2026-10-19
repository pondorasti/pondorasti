// Prepares every image in content/: lifts each item's subject off its background and crops it
// to the subject (scripts/cutout.swift, macOS only), then saves it as WebP at most 2000px on
// its long side, in place. Book covers are kept whole. Drop a photo into an item's folder
// (e.g. image.png), then run `bun run images`; images that are already clean are left alone.
// JPEG, PNG and WebP work everywhere; HEIC, AVIF, TIFF and GIF need macOS or Windows.
// Finally it draws the Open Graph card for every item and view that lacks one into og/, and
// deletes cards nothing uses any more.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadContent } from "../src/content/load"
import { renderCard } from "../src/content/og-render"

const MAX_SIDE = 2000
const QUALITY = 85
const SOURCE = /\.(avif|gif|heic|jpe?g|png|tiff?|webp)$/i
const content = path.join(import.meta.dirname, "../content")
const og = path.join(import.meta.dirname, "../og")

const sources = readdirSync(content, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && SOURCE.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name))

// Each item's main image, unless the item is a book: a cover is already flat and its own shape.
const cutouts = sources.filter((source) => {
  if (!path.basename(source).startsWith("image.")) return false
  const markdown = readFileSync(path.join(path.dirname(source), "index.md"), "utf8")
  return !/^tag:\s*books\s*$/m.test(markdown)
})

const lifted = new Map<string, string>()
const work = mkdtempSync(path.join(tmpdir(), "supply-images-"))
if (process.platform !== "darwin") {
  console.warn("Backgrounds are only removed on macOS; converting images as they are.")
} else if (cutouts.length > 0) {
  const run = Bun.spawnSync(
    ["swift", path.join(import.meta.dirname, "cutout.swift"), work, ...cutouts],
    { stderr: "inherit" }
  )
  if (!run.success) throw new Error("scripts/cutout.swift failed")
  for (const line of run.stdout.toString().split("\n").filter(Boolean)) {
    const [index, source] = line.split("\t")
    lifted.set(source, path.join(work, `${index}.png`))
  }
}

for (const source of sources) {
  const target = source.replace(SOURCE, ".webp")
  const input = lifted.get(source) ?? source
  const { width, height, format } = await new Bun.Image(input).metadata()
  if (input === source && format === "webp" && Math.max(width, height) <= MAX_SIDE) continue
  // Encode fully before writing, since the target may be the source itself.
  const output = await new Bun.Image(input)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .bytes()
  await Bun.write(target, output)
  if (target !== source) rmSync(source)
  console.log(`${path.relative(content, source)} → ${path.relative(content, target)}`)
}
rmSync(work, { recursive: true })

// Cards are named by a hash of what they show and how they're drawn, so any change to an item,
// its image or og-render.ts shows up here as a missing file.
const { images, cards } = loadContent(content)
mkdirSync(og, { recursive: true })
const wanted = new Set([...cards.keys()].map((url) => path.basename(url)))
for (const file of readdirSync(og)) {
  if (file.endsWith(".jpg") && !wanted.has(file)) rmSync(path.join(og, file))
}
let drawn = 0
for (const [url, card] of cards) {
  const target = path.join(og, path.basename(url))
  if (existsSync(target)) continue
  await Bun.write(target, await renderCard(card, (image) => images.get(image)))
  drawn++
}
if (drawn) console.log(`og/: drew ${drawn} Open Graph cards`)
