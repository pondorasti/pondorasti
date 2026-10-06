import type { SupplyEnv } from "../sync"

export async function serveImage(request: Request, env: SupplyEnv) {
  const hash = new URL(request.url).pathname.slice("/images/".length)
  if (!/^[a-f0-9]{64}$/.test(hash)) return new Response(null, { status: 404 })
  const object =
    request.method === "HEAD"
      ? await env.IMAGES.head(`images/${hash}`)
      : await env.IMAGES.get(`images/${hash}`)
  if (!object) return new Response(null, { status: 404 })
  const body = "body" in object ? (object as R2ObjectBody).body : null
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    ETag: object.httpEtag
  })
  object.writeHttpMetadata(headers)
  if (
    request.headers
      .get("If-None-Match")
      ?.split(",")
      .some((tag) => tag.trim().replace(/^W\//, "") === object.httpEtag || tag.trim() === "*")
  ) {
    await body?.cancel()
    return new Response(null, { status: 304, headers })
  }
  headers.set("Content-Length", String(object.size))
  return new Response(body, { headers })
}
