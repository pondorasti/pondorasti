// Prepares every image in content/: lifts each item's subject off its background and crops it
// to the subject (scripts/cutout.swift, macOS only), then saves it as WebP at most 2000px on
// its long side, in place. Book covers are kept whole. Drop a photo into an item's folder
// (e.g. image.png), then run `bun run images`; images that are already clean are left alone.
// JPEG, PNG and WebP work everywhere; HEIC, AVIF, TIFF and GIF need macOS or Windows.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const MAX_SIDE = 2000
const QUALITY = 85
const SOURCE = /\.(avif|gif|heic|jpe?g|png|tiff?|webp)$/i
const content = path.join(import.meta.dirname, "../content")

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
