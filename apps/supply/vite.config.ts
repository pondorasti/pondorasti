import process from "node:process"
import { defineConfig, lazyPlugins } from "vite-plus"
import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// `bun run dev:remote` reads the production D1 and R2 instead of local state.
const remote = process.env.SUPPLY_REMOTE === "1"

export default defineConfig({
  plugins: lazyPlugins(() => [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // Mutate in place: returned arrays are concatenated (defu), not replaced.
      config: remote
        ? (config) => {
            for (const binding of [...config.d1_databases, ...config.r2_buckets]) {
              binding.remote = true
            }
          }
        : undefined
    }),
    tailwindcss(),
    tanstackStart(),
    react()
  ])
})
