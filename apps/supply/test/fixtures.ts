import { vi } from "vitest"
import type { Clock, HttpFetch } from "../src/server/runtime"

export const SOURCE_ID = "3b6b49ce-7f0b-80cd-ad07-000b96417ff1"
export const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])

export function fakeClock() {
  let time = 1_800_000_000_000
  const delays: number[] = []
  return {
    now: () => time,
    sleep: async (ms: number) => {
      delays.push(ms)
      time += ms
    },
    advance: (ms: number) => {
      time += ms
    },
    delays
  } satisfies Clock & { advance(ms: number): void; delays: number[] }
}

export function rich(text: string, href: string | null = null) {
  return {
    type: "text",
    text: { content: text, link: href ? { url: href } : null },
    plain_text: text,
    href,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default"
    }
  }
}

export function notionPage(
  id = "p1",
  options: { name?: string; status?: string; revision?: string; image?: string | null } = {}
) {
  return {
    object: "page",
    id,
    url: `https://www.notion.so/${id}`,
    in_trash: false,
    last_edited_time: options.revision ?? "2026-09-13T00:00:00Z",
    parent: { type: "data_source_id", data_source_id: SOURCE_ID },
    properties: {
      Name: { type: "title", title: [rich(options.name ?? `Product ${id}`)] },
      Link: { type: "url", url: "https://example.com/product" },
      "Ownership status": { type: "select", select: { name: options.status ?? "Owned" } },
      Tags: { type: "multi_select", multi_select: [{ name: "Office" }] },
      Thumbnail: {
        type: "files",
        files:
          options.image === null
            ? []
            : [
                {
                  type: "file",
                  name: "product.png",
                  file: {
                    url:
                      options.image ??
                      `https://prod-files-secure.s3.us-west-2.amazonaws.com/${id}.png?signature=one`,
                    expiry_time: "2026-09-13T01:00:00Z"
                  }
                }
              ]
      }
    }
  }
}

export function paragraph(id: string, text: string, hasChildren = false) {
  return {
    object: "block",
    id,
    type: "paragraph",
    has_children: hasChildren,
    paragraph: { rich_text: [rich(text)] }
  }
}

export function list(results: unknown[], cursor: string | null = null) {
  return { object: "list", results, has_more: cursor !== null, next_cursor: cursor }
}

export function notionHttp(rows = [notionPage()], bodies: Record<string, unknown[]> = {}) {
  const calls: string[] = []
  const request = vi.fn<HttpFetch>(async (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url
    )
    calls.push(url.pathname + url.search)
    if (url.pathname === `/v1/data_sources/${SOURCE_ID}`)
      return Response.json({ properties: notionPage().properties })
    if (url.pathname === `/v1/data_sources/${SOURCE_ID}/query`) return Response.json(list(rows))
    if (url.pathname.startsWith("/v1/pages/"))
      return Response.json(rows.find((row) => row.id === url.pathname.split("/").at(-1)))
    const match = url.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/)
    if (match) return Response.json(list(bodies[match[1]] ?? []))
    throw new Error(`Unexpected test request: ${url.pathname}`)
  })
  return { request, calls }
}
