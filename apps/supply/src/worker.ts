import handler from "@tanstack/react-start/server-entry"
import { handleRequest } from "./http"
import { scheduledSync } from "./sync"

export default {
  async fetch(request: Request, env: Env) {
    return (await handleRequest(request, env)) ?? handler.fetch(request)
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await scheduledSync(env)
  }
}
