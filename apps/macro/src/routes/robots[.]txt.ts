import { createFileRoute } from "@tanstack/react-router"

// Personal health logs: public, but not for search engines.
export const Route = createFileRoute("/robots.txt")({
  // HEAD falls back to GET; ANY keeps other methods from rendering an HTML page.
  server: {
    handlers: {
      GET: () =>
        new Response("User-agent: *\nDisallow: /\n", {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } })
    }
  }
})
