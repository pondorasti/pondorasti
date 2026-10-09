import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"
import { methodNotAllowed, robots } from "../read/seo"

export const Route = createFileRoute("/robots.txt")({
  // HEAD falls back to GET; ANY keeps other methods from rendering an HTML page.
  server: {
    handlers: { GET: () => robots(env.PUBLIC_ORIGIN), ANY: () => methodNotAllowed("GET, HEAD") }
  }
})
