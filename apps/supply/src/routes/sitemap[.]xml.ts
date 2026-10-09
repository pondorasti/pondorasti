import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"
import { methodNotAllowed, sitemap } from "../read/seo"

export const Route = createFileRoute("/sitemap.xml")({
  // HEAD falls back to GET; ANY keeps other methods from rendering an HTML page.
  server: {
    handlers: {
      GET: () => sitemap(env.PUBLIC_ORIGIN),
      ANY: () => methodNotAllowed("GET, HEAD")
    }
  }
})
