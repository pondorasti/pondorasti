import { getCatalog, getProduct } from "../read/catalog"
import type { SupplyEnv, SyncOptions } from "../sync"
import { serveImage } from "./images"
import { json, methodNotAllowed } from "./responses"
import { robots, sitemap } from "./seo"
import { handleSync } from "./sync"

type Handler = (request: Request, env: SupplyEnv, options: SyncOptions) => Promise<Response>

// Raw Worker endpoints answered before TanStack Start; first match wins.
const routes: { match: (path: string) => boolean; methods: string[]; handle: Handler }[] = [
  { match: (path) => path === "/api/sync", methods: ["GET", "POST"], handle: handleSync },
  { match: (path) => path.startsWith("/images/"), methods: ["GET", "HEAD"], handle: serveImage },
  { match: (path) => path === "/robots.txt", methods: ["GET"], handle: robots },
  { match: (path) => path === "/sitemap.xml", methods: ["GET"], handle: sitemap },
  {
    match: (path) => path === "/api/health",
    methods: ["GET"],
    handle: async (_request, env) => {
      await env.DB.prepare("SELECT 1").first()
      return json({ status: "ok" })
    }
  },
  {
    match: (path) => path === "/api/catalog",
    methods: ["GET"],
    handle: async (_request, env) => json(await getCatalog(env.DB))
  },
  {
    match: (path) => path.startsWith("/api/products/"),
    methods: ["GET"],
    handle: async (request, env) => {
      const slug = new URL(request.url).pathname.slice("/api/products/".length)
      const product = await getProduct(env.DB, slug)
      return product ? json(product) : json({ error: "not_found" }, 404)
    }
  },
  {
    match: (path) => path.startsWith("/api/"),
    methods: ["GET"],
    handle: async () => json({ error: "not_found" }, 404)
  }
]

export async function handleRequest(
  request: Request,
  env: SupplyEnv,
  options: SyncOptions = {}
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const route = routes.find((candidate) => candidate.match(path))
  if (!route) return null
  if (!route.methods.includes(request.method)) return methodNotAllowed(route.methods.join(", "))
  return route.handle(request, env, options)
}
