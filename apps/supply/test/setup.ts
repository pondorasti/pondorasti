import { env } from "cloudflare:workers"
import { applyD1Migrations } from "cloudflare:test"
import type { D1Migration } from "@cloudflare/vitest-plugin"
import { inject } from "vite-plus/test"

declare module "vitest" {
  interface ProvidedContext {
    migrations: D1Migration[]
  }
}

await applyD1Migrations(env.DB, inject("migrations"))
