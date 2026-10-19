import handler from "@tanstack/react-start/server-entry"
import { env } from "cloudflare:workers"

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    if (url.hostname === "alexandru.supply") {
      return Response.redirect(new URL(url.pathname + url.search, env.PUBLIC_ORIGIN), 301)
    }
    return handler.fetch(request)
  }
} satisfies ExportedHandler
