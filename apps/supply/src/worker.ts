import handler from "@tanstack/react-start/server-entry"
import { handleApi, scheduledSync } from "./server/http"
import type { SupplyEnv } from "./server/sync"

export default {
  async fetch(request: Request, env: SupplyEnv) {
    return (await handleApi(request, env)) ?? handler.fetch(request)
  },
  async scheduled(_event: ScheduledController, env: SupplyEnv) {
    await scheduledSync(env)
  }
}
