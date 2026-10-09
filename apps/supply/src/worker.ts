import handler from "@tanstack/react-start/server-entry"

export default {
  fetch: (request: Request) => handler.fetch(request)
} satisfies ExportedHandler
