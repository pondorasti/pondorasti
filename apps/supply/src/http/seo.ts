import { getCatalog } from "../read/catalog"
import type { SupplyEnv } from "../sync"

export async function robots(_request: Request, env: SupplyEnv) {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${env.PUBLIC_ORIGIN}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )
}

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

export async function sitemap(_request: Request, env: SupplyEnv) {
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
