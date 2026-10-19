// Draws Open Graph cards. Only `bun run images` and the tests load this, so satori and sharp stay
// out of the build; editing it changes every card's URL (see og.ts).
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import satori from "satori"
import sharp from "sharp"
import type { OgCard } from "./og"

export const OG_SIZE = { width: 1200, height: 630 }

// Light theme colors from styles.css: previews mostly land in light feeds.
const PAGE = "#f2f2f2"
const SURFACE = "#ffffff"
const INK = "#141414"
const MUTED = "#6e6e6e"

// satori takes React-shaped elements; plain objects keep this file free of JSX.
type Element = { type: string; props: Record<string, unknown> }
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Element => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children }
})

let fonts: { name: string; data: Buffer; weight: 400 | 500 }[] | undefined
function loadFonts() {
  // The package only exports its next/font entries, so the TTFs are found next to one.
  const dir = path.join(
    path.dirname(createRequire(import.meta.url).resolve("geist/font/sans")),
    "fonts/geist-sans"
  )
  return (fonts ??= [
    { name: "Geist", data: readFileSync(path.join(dir, "Geist-Regular.ttf")), weight: 400 },
    { name: "Geist", data: readFileSync(path.join(dir, "Geist-Medium.ttf")), weight: 500 }
  ])
}

/** Inlines an image as PNG (satori can't read WebP), scaled to fit the box. */
async function inline(file: string, box: number) {
  const { data, info } = await sharp(file)
    .resize(box, box, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
  return { src: `data:image/png;base64,${data.toString("base64")}`, ...info }
}

async function stage(file: string, size: number, radius: number) {
  const image = await inline(file, Math.round(size * 0.8))
  return h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: radius,
      background: SURFACE
    },
    { type: "img", props: { src: image.src, width: image.width, height: image.height } }
  )
}

const wordmark = h(
  "div",
  { display: "flex", fontSize: 26, fontWeight: 500, letterSpacing: "0.025em" },
  // Thin spaces, matching the header.
  "[\u2009supply.",
  h("span", { color: MUTED }, "alexandru.so"),
  "\u2009]"
)

/** Renders a card to a 1200×630 JPEG; `resolve` maps an image URL to its file. */
export async function renderCard(card: OgCard, resolve: (url: string) => string | undefined) {
  const file = (url: string) => {
    const found = resolve(url)
    if (!found) throw new Error(`OG card references an unknown image: ${url}`)
    return found
  }
  const root = {
    ...OG_SIZE,
    display: "flex",
    // satori defaults to content-box, which would grow the card by its padding.
    boxSizing: "border-box",
    padding: 40,
    background: PAGE,
    color: INK,
    fontFamily: "Geist"
  }
  const element =
    card.kind === "item"
      ? h(
          "div",
          { ...root, gap: 40 },
          h(
            "div",
            {
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "24px 0 24px 24px"
            },
            wordmark,
            h(
              "div",
              { display: "flex", flexDirection: "column", gap: 16 },
              h("div", { fontSize: 30, color: MUTED }, card.eyebrow),
              h(
                "div",
                {
                  display: "block",
                  // Long names step down a size rather than lose their ending.
                  fontSize: card.title.length > 28 ? 48 : 60,
                  fontWeight: 500,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  lineClamp: card.title.length > 28 ? 4 : 3,
                  textWrap: "balance"
                },
                card.title
              )
            )
          ),
          await stage(file(card.image), 550, 32)
        )
      : h(
          "div",
          { ...root, flexDirection: "column", justifyContent: "space-between", padding: 64 },
          wordmark,
          h(
            "div",
            {
              display: "block",
              fontSize: 64,
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              whiteSpace: "pre-line",
              textWrap: "balance"
            },
            card.headline
          ),
          h(
            "div",
            { display: "flex", gap: 16 },
            ...(await Promise.all(card.images.map((image) => stage(file(image), 200, 24))))
          )
        )
  const svg = await satori(element as never, { ...OG_SIZE, fonts: loadFonts() })
  return sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
}
