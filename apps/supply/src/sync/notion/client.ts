import { Client, isFullBlock, isFullPage } from "@notionhq/client"
import { SyncError, systemClock, type Clock, type HttpFetch } from "../runtime"
import {
  fileReference,
  mapBlock,
  mapProduct,
  type RemoteImage,
  type SourceBlock,
  type SourceProduct
} from "./map"

export interface NotionOptions {
  fetch?: HttpFetch
  clock?: Clock
  spacingMs?: number
  retries?: number
  checkpoint?: () => Promise<void>
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
      // The SDK treats any WorkerGlobalScope as a browser, Cloudflare Workers included.
      // This module only runs in the sync Worker; the token never reaches a browser bundle.
      dangerouslyAllowBrowser: true,
      logger: () => {},
      fetch: async (input, init) => {
        const started = this.clock.now()
        for (let attempt = 0; ; attempt++) {
          await this.clock.sleep(Math.max(0, this.nextRequest - this.clock.now()))
          await options.checkpoint?.()
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
