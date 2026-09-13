import {
  Client,
  isFullBlock,
  isFullPage,
  type BlockObjectResponse,
  type PageObjectResponse,
  type RichTextItemResponse
} from "@notionhq/client"
import { safeLink, type ContentBlock, type TextRun } from "../catalog"
import { SyncError, systemClock, type Clock, type HttpFetch } from "./runtime"

export interface RemoteImage {
  url: string
  ownerId: string
  ownerType: "page" | "block"
}

export interface SourceBlock extends Omit<ContentBlock, "children"> {
  children: SourceBlock[]
  file?: RemoteImage
}

export interface SourceProduct {
  id: string
  name: string
  link: string | null
  ownership: string
  tags: string[]
  revision: string
  properties: string
  thumbnail?: RemoteImage
}

type NotionFile = { type?: string; file?: { url: string }; external?: { url: string } }

function fileReference(file: NotionFile | undefined, ownerId: string, ownerType: "page" | "block") {
  if (!file) return undefined
  const url = file.file?.url ?? file.external?.url
  if (!url) throw new SyncError("unsupported_notion_file")
  return { url, ownerId, ownerType }
}

export function mapProduct(page: PageObjectResponse): SourceProduct {
  const {
    Name: name,
    Link: link,
    "Ownership status": status,
    Tags: tags,
    Thumbnail: thumbnail
  } = page.properties
  if (
    name?.type !== "title" ||
    link?.type !== "url" ||
    status?.type !== "select" ||
    tags?.type !== "multi_select" ||
    thumbnail?.type !== "files"
  ) {
    throw new SyncError("notion_schema_changed")
  }
  return {
    id: page.id,
    name: name.title.map((run) => run.plain_text).join(""),
    link: safeLink(link.url) ?? null,
    ownership: status.select?.name ?? "",
    tags: tags.multi_select.map((tag) => tag.name),
    revision: page.last_edited_time,
    properties: JSON.stringify(page.properties),
    thumbnail: fileReference(thumbnail.files[0], page.id, "page")
  }
}

function textRuns(runs: RichTextItemResponse[]): TextRun[] {
  return runs.map((run) => ({
    text: run.plain_text,
    ...(run.annotations.bold && { bold: true }),
    ...(run.annotations.italic && { italic: true }),
    ...(run.annotations.code && { code: true }),
    ...(run.annotations.strikethrough && { strike: true }),
    ...(safeLink(run.href) && { href: safeLink(run.href) })
  }))
}

function mapBlock(block: BlockObjectResponse): SourceBlock {
  let runs: RichTextItemResponse[] = []
  let file: RemoteImage | undefined
  let checked: boolean | undefined
  switch (block.type) {
    case "paragraph":
      runs = block.paragraph.rich_text
      break
    case "heading_1":
      runs = block.heading_1.rich_text
      break
    case "heading_2":
      runs = block.heading_2.rich_text
      break
    case "heading_3":
      runs = block.heading_3.rich_text
      break
    case "bulleted_list_item":
      runs = block.bulleted_list_item.rich_text
      break
    case "numbered_list_item":
      runs = block.numbered_list_item.rich_text
      break
    case "quote":
      runs = block.quote.rich_text
      break
    case "callout":
      runs = block.callout.rich_text
      break
    case "code":
      runs = block.code.rich_text
      break
    case "toggle":
      runs = block.toggle.rich_text
      break
    case "to_do":
      runs = block.to_do.rich_text
      checked = block.to_do.checked
      break
    case "image":
      runs = block.image.caption
      file = fileReference(block.image, block.id, "block")
      break
  }
  return {
    id: block.id,
    type: block.type,
    text: textRuns(runs),
    children: [],
    ...(file && { file }),
    ...(checked !== undefined && { checked })
  }
}

export interface NotionOptions {
  fetch?: HttpFetch
  clock?: Clock
  spacingMs?: number
  retries?: number
}

export class NotionSource {
  private readonly client: Client
  private readonly clock: Clock
  private nextRequest = 0

  constructor(
    token: string,
    private readonly dataSourceId: string,
    options: NotionOptions = {}
  ) {
    this.clock = options.clock ?? systemClock
    const fetcher = options.fetch ?? fetch
    this.client = new Client({
      auth: token,
      notionVersion: "2026-03-11",
      timeoutMs: 120_000,
      retry: false,
      logger: () => {},
      fetch: async (input, init) => {
        const started = this.clock.now()
        for (let attempt = 0; ; attempt++) {
          await this.clock.sleep(Math.max(0, this.nextRequest - this.clock.now()))
          this.nextRequest = this.clock.now() + (options.spacingMs ?? 550)
          const response = await fetcher(input, { ...init, signal: AbortSignal.timeout(30_000) })
          if (![429, 529, 500, 502, 503, 504].includes(response.status)) return response
          await response.body?.cancel()
          if (attempt >= (options.retries ?? 4)) throw new SyncError("notion_retries_exhausted")
          const retryAfter = response.headers.get("Retry-After")
          const seconds = retryAfter === null ? NaN : Number(retryAfter)
          const delay = Number.isFinite(seconds)
            ? Math.max(0, seconds * 1000)
            : retryAfter && Number.isFinite(Date.parse(retryAfter))
              ? Math.max(0, Date.parse(retryAfter) - this.clock.now())
              : 1000 * 2 ** attempt + Math.floor(Math.random() * 250)
          if (this.clock.now() - started + delay > 90_000)
            throw new SyncError("notion_retry_budget")
          await this.clock.sleep(delay)
        }
      }
    })
  }

  async scan(): Promise<SourceProduct[]> {
    const schema = await this.client.dataSources.retrieve({ data_source_id: this.dataSourceId })
    const expected = {
      Name: "title",
      Link: "url",
      "Ownership status": "select",
      Tags: "multi_select",
      Thumbnail: "files"
    }
    if (Object.entries(expected).some(([key, type]) => schema.properties[key]?.type !== type)) {
      throw new SyncError("notion_schema_changed")
    }
    const products: SourceProduct[] = []
    const ids = new Set<string>()
    const cursors = new Set<string>()
    let cursor: string | undefined
    do {
      const page = await this.client.dataSources.query({
        data_source_id: this.dataSourceId,
        page_size: 100,
        ...(cursor && { start_cursor: cursor })
      })
      for (const row of page.results) {
        if (!isFullPage(row)) throw new SyncError("incomplete_notion_page")
        if (ids.has(row.id)) throw new SyncError("unstable_notion_scan")
        ids.add(row.id)
        if (!row.in_trash) products.push(mapProduct(row))
      }
      if (products.length > 750) throw new SyncError("catalog_limit")
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined
      if (page.has_more && (!cursor || cursors.has(cursor)))
        throw new SyncError("invalid_notion_cursor")
      if (cursor) cursors.add(cursor)
    } while (cursor)
    return products
  }

  async page(id: string): Promise<SourceProduct> {
    const page = await this.client.pages.retrieve({ page_id: id })
    if (!isFullPage(page) || page.in_trash) throw new SyncError("notion_page_unavailable")
    return mapProduct(page)
  }

  async body(id: string): Promise<SourceBlock[]> {
    let count = 0
    const read = async (parent: string, ancestors: Set<string>): Promise<SourceBlock[]> => {
      if (ancestors.has(parent) || ancestors.size > 30) throw new SyncError("notion_block_depth")
      const path = new Set([...ancestors, parent])
      const blocks: SourceBlock[] = []
      const cursors = new Set<string>()
      let cursor: string | undefined
      do {
        const page = await this.client.blocks.children.list({
          block_id: parent,
          page_size: 100,
          ...(cursor && { start_cursor: cursor })
        })
        for (const raw of page.results) {
          if (!isFullBlock(raw)) throw new SyncError("incomplete_notion_block")
          if (++count > 5000) throw new SyncError("notion_block_limit")
          const block = mapBlock(raw)
          if (raw.has_children) block.children = await read(raw.id, path)
          blocks.push(block)
        }
        cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined
        if (page.has_more && (!cursor || cursors.has(cursor)))
          throw new SyncError("invalid_notion_cursor")
        if (cursor) cursors.add(cursor)
      } while (cursor)
      return blocks
    }
    return read(id, new Set())
  }

  async refreshImage(image: RemoteImage): Promise<RemoteImage> {
    if (image.ownerType === "page") {
      const refreshed = (await this.page(image.ownerId)).thumbnail
      if (!refreshed) throw new SyncError("notion_image_removed")
      return refreshed
    }
    const block = await this.client.blocks.retrieve({ block_id: image.ownerId })
    if (!isFullBlock(block) || block.type !== "image") throw new SyncError("notion_image_removed")
    return fileReference(block.image, block.id, "block")!
  }
}
