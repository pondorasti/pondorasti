import { getCatalog } from "./catalog"

export function robots(origin: string) {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    }
  )
}

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

export async function sitemap(database: D1Database, origin: string) {
  const catalog = await getCatalog(database)
  const urls = [origin, ...catalog.map((product) => `${origin}/items/${product.slug}`)]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((href) => `<url><loc>${escape(href)}</loc></url>`).join("")}</urlset>`,
    {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-cache" }
    }
  )
}
