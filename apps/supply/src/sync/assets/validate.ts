import { SyncError } from "../runtime"

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const NOTION_HOSTS = [
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "s3.us-west-2.amazonaws.com",
  "s3-us-west-2.amazonaws.com",
  "secure.notion-static.com"
]

/** Only Notion-hosted files are mirrored; images linked from other sites are rejected. */
export function imageUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !NOTION_HOSTS.includes(url.hostname)
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

export async function readImage(response: Response): Promise<ArrayBuffer> {
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
