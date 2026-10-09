// Converts every image in content/ to WebP at most 2000px on its long side, in place.
// Drop a photo into an item's folder (e.g. image.png), then run `bun run images`.
// JPEG, PNG and WebP work everywhere; HEIC, AVIF, TIFF and GIF need macOS or Windows.
import { readdirSync, rmSync } from "node:fs"
import path from "node:path"

const MAX_SIDE = 2000
const QUALITY = 85
const SOURCE = /\.(avif|gif|heic|jpe?g|png|tiff?|webp)$/i
const content = path.join(import.meta.dirname, "../content")

for (const entry of readdirSync(content, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !SOURCE.test(entry.name)) continue
  const source = path.join(entry.parentPath, entry.name)
  const target = source.replace(SOURCE, ".webp")
  const { width, height, format } = await new Bun.Image(source).metadata()
  if (format === "webp" && Math.max(width, height) <= MAX_SIDE) continue
  // Encode fully before writing, since the target may be the source itself.
  const output = await new Bun.Image(source)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .bytes()
  await Bun.write(target, output)
  if (target !== source) rmSync(source)
  console.log(`${path.relative(content, source)} → ${path.relative(content, target)}`)
}
