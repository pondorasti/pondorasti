import handler from "@tanstack/react-start/server-entry"
import { INGEST_PATH, ingest } from "./ingest/handler"

export default {
  fetch: (request, env) =>
    new URL(request.url).pathname === INGEST_PATH ? ingest(request, env) : handler.fetch(request)
} satisfies ExportedHandler<Env>
