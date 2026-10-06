import type { SyncOptions } from "../sync"
import { serveImage } from "./images"
import { json, methodNotAllowed } from "./responses"
import { handleSync } from "./sync"

type Handler = (request: Request, env: Env, options: SyncOptions) => Promise<Response>

// Raw Worker endpoints answered before TanStack Start (no SSR cost); first match wins.
const routes: { match: (path: string) => boolean; methods: string[]; handle: Handler }[] = [
  { match: (path) => path === "/api/sync", methods: ["GET", "POST"], handle: handleSync },
  { match: (path) => path.startsWith("/images/"), methods: ["GET", "HEAD"], handle: serveImage },
  {
    match: (path) => path === "/api/health",
    methods: ["GET"],
    handle: async (_request, env) => {
      await env.DB.prepare("SELECT 1").first()
      return json({ status: "ok" })
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
  env: Env,
  options: SyncOptions = {}
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const route = routes.find((candidate) => candidate.match(path))
  if (!route) return null
  if (!route.methods.includes(request.method)) return methodNotAllowed(route.methods.join(", "))
  return route.handle(request, env, options)
}
