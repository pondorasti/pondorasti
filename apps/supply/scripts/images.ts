// Prepares every image in content/: lifts each item's subject off its background and crops it
// to the subject (scripts/cutout.py, BiRefNet through uv), then saves it as WebP at most 2000px
// on its long side, in place. Book covers are kept whole. Drop a photo into an item's folder
// (e.g. image.png), then run `bun run images`; images that are already clean are left alone.
// The photo a cut-out was lifted from is kept as original.webp next to it, so the item can be
// cut again later with `bun run images --recut <slug>...` (or `--recut` alone for every item
// that has one). JPEG, PNG and WebP work everywhere; HEIC, AVIF, TIFF and GIF need macOS or
// Windows. Finally it draws the Open Graph card for every item and view that lacks one into og/,
// and deletes cards nothing uses any more.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadContent } from "../src/content/load"
import { README_PREVIEW } from "../src/content/og"
import { renderCard } from "../src/content/og-render"

const MAX_SIDE = 2000
const QUALITY = 85
/** Originals keep more room than the output, since the cut-out is cropped from them. */
const ORIGINAL_MAX_SIDE = 3000
const ORIGINAL_QUALITY = 90
const ORIGINAL = "original.webp"
const SOURCE = /\.(avif|gif|heic|jpe?g|png|tiff?|webp)$/i
const content = path.join(import.meta.dirname, "../content")
const og = path.join(import.meta.dirname, "../og")

const recutIndex = process.argv.indexOf("--recut")
const recut = recutIndex === -1 ? undefined : process.argv.slice(recutIndex + 1)

const sources = readdirSync(content, { recursive: true, withFileTypes: true })
  .filter(
    (entry) => entry.isFile() && SOURCE.test(entry.name) && !entry.name.startsWith("original.")
  )
  .map((entry) => path.join(entry.parentPath, entry.name))

const isBook = (folder: string) =>
  /^tag:\s*books\s*$/m.test(readFileSync(path.join(folder, "index.md"), "utf8"))

/** One image to lift: `input` is what the cutter reads, `original` what to keep if it lifts. */
interface Job {
  input: string
  target: string
  original?: string
}

const work = mkdtempSync(path.join(tmpdir(), "supply-images-"))
const jobs: Job[] = []
if (recut) {
  const slugs = recut.length
    ? recut
    : readdirSync(content).filter((slug) => existsSync(path.join(content, slug, ORIGINAL)))
  for (const slug of slugs) {
    const input = path.join(content, slug, ORIGINAL)
    if (!existsSync(input)) throw new Error(`content/${slug}/${ORIGINAL} doesn't exist`)
    jobs.push({ input, target: path.join(content, slug, "image.webp") })
  }
} else {
  // Each item's main image, unless the item is a book: a cover is already flat and its own shape.
  for (const source of sources) {
    const folder = path.dirname(source)
    if (!path.basename(source).startsWith("image.") || isBook(folder)) continue
    const { width, height, format } = await new Bun.Image(source).metadata()
    let input = source
    // The cutter reads what's kept as the original, so a later recut starts from the same pixels.
    if (format !== "webp" || Math.max(width, height) > ORIGINAL_MAX_SIDE) {
      input = path.join(work, `${jobs.length}.webp`)
      const bytes = await new Bun.Image(source)
        .resize(ORIGINAL_MAX_SIDE, ORIGINAL_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: ORIGINAL_QUALITY })
        .bytes()
      await Bun.write(input, bytes)
    }
    jobs.push({
      input,
      target: path.join(folder, "image.webp"),
      original: path.join(folder, ORIGINAL)
    })
  }
}

// What each lifted or cropped job turned into, by target.
const cut = new Map<string, string>()
if (jobs.length > 0 && !Bun.which("uv")) {
  if (recut) throw new Error("Recutting needs uv: https://docs.astral.sh/uv/")
  console.warn("uv isn't installed, so backgrounds aren't removed; converting images as they are.")
} else if (jobs.length > 0) {
  const run = Bun.spawnSync(
    [
      "uv",
      "run",
      "--quiet",
      "--locked",
      "--script",
      path.join(import.meta.dirname, "cutout.py"),
      work,
      ...jobs.map((job) => job.input)
    ],
    { stderr: "inherit" }
  )
  if (!run.success) throw new Error("scripts/cutout.py failed")
  for (const line of run.stdout.toString().split("\n").filter(Boolean)) {
    const [index, , action] = line.split("\t")
    const job = jobs[Number(index)]
    cut.set(job.target, path.join(work, `${index}.png`))
    if (action === "lifted" && job.original && job.input !== job.original) {
      copyFileSync(job.input, job.original)
      console.log(`${path.relative(content, job.original)}: kept the photo it was cut from`)
    }
  }
}

const write = async (input: string, target: string) => {
  // Encode fully before writing, since the target may be the input itself.
  const output = await new Bun.Image(input)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .bytes()
  await Bun.write(target, output)
}

if (recut) {
  for (const [target, input] of cut) {
    await write(input, target)
    console.log(`${path.relative(content, target)}: cut again from ${ORIGINAL}`)
  }
} else {
  for (const source of sources) {
    const target = source.replace(SOURCE, ".webp")
    const input = cut.get(target) ?? source
    const { width, height, format } = await new Bun.Image(input).metadata()
    if (input === source && format === "webp" && Math.max(width, height) <= MAX_SIDE) continue
    await write(input, target)
    if (target !== source) rmSync(source)
    console.log(`${path.relative(content, source)} → ${path.relative(content, target)}`)
  }
}
rmSync(work, { recursive: true })

// Cards are named by a hash of what they show and how they're drawn, so any change to an item,
// its image or og-render.ts shows up here as a missing file.
const { images, cards, views } = loadContent(content)
mkdirSync(og, { recursive: true })
const wanted = new Set([...cards.keys()].map((url) => path.basename(url)))
wanted.add(README_PREVIEW)
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
copyFileSync(path.join(og, path.basename(views.collection)), path.join(og, README_PREVIEW))
