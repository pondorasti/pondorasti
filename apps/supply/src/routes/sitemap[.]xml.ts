import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"
import { methodNotAllowed } from "../http/responses"
import { sitemap } from "../read/seo"

export const Route = createFileRoute("/sitemap.xml")({
  // HEAD falls back to GET; ANY keeps other methods from rendering an HTML page.
  server: {
    handlers: {
      GET: () => sitemap(env.DB, env.PUBLIC_ORIGIN),
      ANY: () => methodNotAllowed("GET, HEAD")
    }
  }
})
