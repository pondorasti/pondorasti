import { timingSafeEqual } from "node:crypto"
import { desc } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { getCatalog, getProduct } from "./catalog"
import { SyncError } from "./runtime"
import { syncRuns, syncState } from "./schema"
import { runSync, type SupplyEnv, type SyncOptions } from "./sync"

function authorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false
  const expected = new TextEncoder().encode(`Bearer ${secret}`)
  const received = new TextEncoder().encode(request.headers.get("Authorization") ?? "")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex"
    }
  })
const methodNotAllowed = (allow: string) =>
  new Response(null, { status: 405, headers: { Allow: allow } })

export async function scheduledSync(env: SupplyEnv, options: SyncOptions = {}) {
  const result = await runSync(env, options)
  console.info(JSON.stringify({ event: "supply_sync", ...result }))
}

export async function handleApi(
  request: Request,
  env: SupplyEnv,
  options: SyncOptions = {}
): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname
  if (path === "/api/sync") {
    if (!["GET", "POST"].includes(request.method)) return methodNotAllowed("GET, POST")
    if (!authorized(request, env.SYNC_SECRET)) return json({ error: "unauthorized" }, 401)
    if (request.method === "GET") {
      const db = drizzle(env.DB)
      const state = await db
        .select({ lastSuccess: syncState.lastSuccess, lastRun: syncState.lastRun })
        .from(syncState)
      const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(20)
      return json({ state: state[0] ?? null, runs })
    }
    try {
      return json(await runSync(env, { ...options, force: url.searchParams.get("force") === "1" }))
    } catch (error) {
      return json({ error: error instanceof SyncError ? error.code : "sync_failed" }, 503)
    }
  }
  if (path.startsWith("/images/")) {
    if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed("GET, HEAD")
    const hash = path.slice("/images/".length)
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
  if (path.startsWith("/api/") || ["/robots.txt", "/sitemap.xml"].includes(path)) {
    if (request.method !== "GET") return methodNotAllowed("GET")
    if (path === "/api/catalog") return json(await getCatalog(env.DB))
    if (path.startsWith("/api/products/")) {
      const product = await getProduct(env.DB, path.slice("/api/products/".length))
      return product ? json(product) : json({ error: "not_found" }, 404)
    }
    if (path === "/api/health") {
      await env.DB.prepare("SELECT 1").first()
      return json({ status: "ok" })
    }
    if (path === "/robots.txt")
      return new Response(
        `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${env.PUBLIC_ORIGIN}/sitemap.xml\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      )
    if (path === "/sitemap.xml") {
      const escape = (value: string) =>
        value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&apos;")
      const catalog = await getCatalog(env.DB)
      const urls = [
        env.PUBLIC_ORIGIN,
        ...catalog.map((product) => `${env.PUBLIC_ORIGIN}/items/${product.slug}`)
      ]
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((href) => `<url><loc>${escape(href)}</loc></url>`).join("")}</urlset>`,
        {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-cache" }
        }
      )
    }
    return json({ error: "not_found" }, 404)
  }
  return null
}
