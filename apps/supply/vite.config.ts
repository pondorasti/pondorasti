import { fileURLToPath } from "node:url"
import { defineConfig, lazyPlugins } from "vite-plus"
import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { content } from "./src/content/plugin"

export default defineConfig({
  plugins: lazyPlugins(() => [
    // Before Cloudflare, so dev serves content images ahead of the Worker.
    content(fileURLToPath(new URL("./content", import.meta.url))),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    react()
  ])
})
