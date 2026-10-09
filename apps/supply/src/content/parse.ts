import { Marked } from "marked"
import { parse as parseYaml } from "yaml"
import { z } from "zod"
import { isSlug, type ProductDetail, type Status, STATUSES, type Tag, TAGS } from "../lib/product"

const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as [T, ...T[]]

const FrontMatter = z.strictObject({
  name: z.string().trim().min(1),
  status: z.enum(keys<Status>(STATUSES)),
  tags: z
    .array(z.enum(keys<Tag>(TAGS)))
    .default([])
    .transform((tags) => [...new Set(tags)]),
  link: z.url({ protocol: /^https?$/ }).optional()
})

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/** Resolves a file in the item's folder to its public URL, or undefined if it isn't a usable image. */
export type ImageResolver = (file: string) => string | undefined

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  )

/** Parses one `content/<slug>/index.md`; throws a readable error for anything the site can't show. */
export function parseItem(slug: string, source: string, image: ImageResolver): ProductDetail {
  if (!isSlug(slug)) throw new Error("folder name must be lowercase words joined by hyphens")
  const match = FENCE.exec(source)
  if (!match) throw new Error("index.md must start with --- front matter ---")
  const result = FrontMatter.safeParse(parseYaml(match[1]))
  if (!result.success) throw new Error(z.prettifyError(result.error))
  const cover = image("image.webp")
  if (!cover) throw new Error("missing image.webp")
  const { name, status, tags, link } = result.data
  return {
    slug,
    name,
    status,
    tags,
    link: link ?? null,
    image: cover,
    notes: renderNotes(match[2], image)
  }
}

export function renderNotes(markdown: string, image: ImageResolver): string {
  const missing: string[] = []
  const marked = new Marked({
    gfm: true,
    renderer: {
      // Item pages already use h1 for the name and h2 for "Notes".
      heading({ tokens, depth }) {
        const level = Math.min(depth + 1, 6)
        return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens)
        return /^https?:\/\//.test(href)
          ? `<a href="${escape(href)}" target="_blank" rel="noreferrer">${text}</a>`
          : text
      },
      image({ href, text }) {
        const src = image(href)
        if (!src) missing.push(href)
        return src ? `<img src="${src}" alt="${escape(text)}" loading="lazy">` : ""
      },
      // Notes are markdown only; raw HTML is shown as text.
      html({ text }) {
        return escape(text)
      }
    }
  })
  const html = marked.parse(markdown, { async: false })
  if (missing.length) throw new Error(`notes reference missing images: ${missing.join(", ")}`)
  return html.trim()
}
