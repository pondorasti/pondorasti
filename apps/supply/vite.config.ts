import { defineConfig, lazyPlugins } from "vite-plus"
import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: lazyPlugins(() => [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    react()
  ])
})
