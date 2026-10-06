import handler from "@tanstack/react-start/server-entry"
import { handleRequest } from "./http"
import { scheduledSync, type SupplyEnv } from "./sync"

export default {
  async fetch(request: Request, env: SupplyEnv) {
    return (await handleRequest(request, env)) ?? handler.fetch(request)
  },
  async scheduled(_event: ScheduledController, env: SupplyEnv) {
    await scheduledSync(env)
  }
}
