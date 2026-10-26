import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

export default defineConfig({
  resolve: {
    alias: { "cloudflare:workers": fileURLToPath(new URL("./tests/workers.ts", import.meta.url)) }
  },
  test: {
    include: ["src/**/*.test.ts"],
    server: { deps: { inline: ["@cloudflare/workers-oauth-provider"] } }
  }
})
