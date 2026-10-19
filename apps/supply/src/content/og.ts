// Card specs and URLs for Open Graph images. The cards themselves are drawn by og-render.ts
// during `bun run images` and committed to og/; the build only copies them.
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { label, type ProductSummary, Tag, type View, viewOf } from "../lib/product"

/** A fixed-name copy of the collection card in og/, for the README, whose card names change. */
export const README_PREVIEW = "collection.jpg"

/** What an Open Graph card shows. Images are public `/images/…` URLs, which are content hashes. */
export type OgCard =
  | { kind: "item"; eyebrow: string; title: string; image: string }
  | { kind: "view"; headline: string; images: string[] }

// Editing the renderer changes every card's URL, so a new design never hides behind a cached image.
const TEMPLATE = createHash("sha256")
  .update(readFileSync(fileURLToPath(new URL("./og-render.ts", import.meta.url))))
  .digest("hex")

/** The card's public URL, a hash of what it shows and how it's drawn. */
export const ogUrl = (card: OgCard) =>
  `/og/${createHash("sha256").update(TEMPLATE).update(JSON.stringify(card)).digest("hex").slice(0, 16)}.jpg`

export function itemCard(item: ProductSummary): OgCard {
  const eyebrow = item.group ? `${label(item.tag)} / ${label(item.group)}` : label(item.tag)
  return { kind: "item", eyebrow, title: item.name, image: item.image }
}

/** Hand-picked items for a view's card, by slug and in order. */
const FEATURED: Partial<Record<View, string[]>> = {
  collection: [
    "poor-charlies-almanack",
    "kinesis-advantage360-professional-bluetooth",
    "peak-design-everyday-totepack-20l-bone",
    "disney-store-grogu-cuddleez-plush-23-inch",
    "isntree-hyaluronic-acid-watery-sun-gel-spf50-pa-50-ml"
  ]
}

/**
 * A view's headline over five of its items: the featured ones, or else one per tag first so the
 * strip stays varied.
 */
export function viewCard(view: View, items: ProductSummary[]): OgCard {
  const { headline, status } = viewOf(view)
  const inView = items.filter((item) => item.status === status)
  const featured = FEATURED[view]?.map((slug) => {
    const item = inView.find((candidate) => candidate.slug === slug)
    if (!item) throw new Error(`Featured item "${slug}" isn't in the ${view} view`)
    return item
  })
  const varied = Tag.options.flatMap((tag) => inView.find((item) => item.tag === tag) ?? [])
  const picks = featured ?? [...new Set([...varied, ...inView])].slice(0, 5)
  return { kind: "view", headline, images: picks.map((item) => item.image) }
}
