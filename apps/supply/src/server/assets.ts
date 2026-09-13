import type { NotionSource, RemoteImage } from "./notion"
import { sha256, SyncError, systemClock, type Clock, type HttpFetch } from "./runtime"
import type { assets } from "./schema"

export type Asset = typeof assets.$inferSelect
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const NOTION_HOSTS = [
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "s3.us-west-2.amazonaws.com",
  "s3-us-west-2.amazonaws.com",
  "secure.notion-static.com"
]

export function imageUrl(value: string, extraHosts: string[] = []): URL {
  const url = new URL(value)
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    ![...NOTION_HOSTS, ...extraHosts].includes(url.hostname)
  ) {
    throw new SyncError("image_host_not_allowed")
  }
  return url
}

export function imageType(bytes: Uint8Array): string {
  const begins = (...prefix: number[]) => prefix.every((byte, i) => bytes[i] === byte)
  if (begins(137, 80, 78, 71, 13, 10, 26, 10)) return "image/png"
  if (begins(255, 216, 255)) return "image/jpeg"
  if (begins(71, 73, 70, 56) && [55, 57].includes(bytes[4]) && bytes[5] === 97) return "image/gif"
  if (begins(82, 73, 70, 70) && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP")
    return "image/webp"
  if (new TextDecoder().decode(bytes.slice(4, 12)) === "ftypavif") return "image/avif"
  throw new SyncError("unsupported_image_bytes")
}

async function readImage(response: Response): Promise<ArrayBuffer> {
  if (Number(response.headers.get("Content-Length")) > MAX_IMAGE_BYTES || !response.body) {
    await response.body?.cancel()
    throw new SyncError("image_size_limit")
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_IMAGE_BYTES) throw new SyncError("image_size_limit")
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes.buffer
}

export class AssetStore {
  readonly added: Asset[] = []
  uploaded = 0
  private readonly known: Map<string, Asset>

  constructor(
    private readonly bucket: R2Bucket,
    private readonly source: NotionSource,
    existing: Asset[],
    private readonly options: { fetch?: HttpFetch; clock?: Clock; allowedHosts?: string[] } = {}
  ) {
    this.known = new Map(existing.map((asset) => [asset.hash, asset]))
  }

  async copy(image: RemoteImage): Promise<string> {
    let current = image
    let refreshed = false
    for (let redirects = 0; redirects < 4; redirects++) {
      const url = imageUrl(current.url, this.options.allowedHosts)
      const response = await (this.options.fetch ?? fetch)(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(30_000)
      })
      if ([401, 403].includes(response.status) && !refreshed) {
        await response.body?.cancel()
        current = await this.source.refreshImage(image)
        refreshed = true
        continue
      }
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel()
        const location = response.headers.get("Location")
        if (!location) throw new SyncError("invalid_image_redirect")
        current = { ...current, url: new URL(location, url).href }
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new SyncError("image_download_failed")
      }
      const bytes = await readImage(response)
      const contentType = imageType(new Uint8Array(bytes))
      const hash = await sha256(bytes)
      if (this.known.has(hash)) return hash
      const key = `images/${hash}`
      if (!(await this.bucket.head(key))) {
        await this.bucket.put(key, bytes, {
          httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" }
        })
        this.uploaded++
      }
      const asset = {
        hash,
        key,
        contentType,
        size: bytes.byteLength,
        createdAt: (this.options.clock ?? systemClock).now()
      }
      this.known.set(hash, asset)
      this.added.push(asset)
      return hash
    }
    throw new SyncError("image_redirect_limit")
  }
}
