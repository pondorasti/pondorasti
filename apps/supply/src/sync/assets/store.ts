import type { assets } from "../../db/schema"
import type { NotionSource } from "../notion/client"
import type { RemoteImage } from "../notion/map"
import { sha256, systemClock, SyncError, type Clock, type HttpFetch } from "../runtime"
import { unwrapRasterSvg } from "./svg"
import { imageType, imageUrl, readImage } from "./validate"

export type Asset = typeof assets.$inferSelect

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
      let bytes = await readImage(response)
      let contentType: string
      try {
        contentType = imageType(new Uint8Array(bytes))
      } catch {
        bytes = unwrapRasterSvg(bytes)
        contentType = imageType(new Uint8Array(bytes))
      }
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
