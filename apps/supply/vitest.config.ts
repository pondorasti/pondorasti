import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-09-13",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        r2Buckets: ["IMAGES"],
        bindings: {
          NOTION_DATA_SOURCE_ID: "3b6b49ce-7f0b-80cd-ad07-000b96417ff1",
          PUBLIC_ORIGIN: "https://alexandru.supply"
        }
      }
    })
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    provide: { migrations: await readD1Migrations("./drizzle") }
  }
})
