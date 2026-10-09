import { readFileSync } from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"
import { type Content, loadContent } from "./load"

const ID = "virtual:supply-content"
const RESOLVED = `\0${ID}`

/**
 * Exposes `content/` as `virtual:supply-content` (validated items, read by the server only) and
 * ships the images as content-addressed `/images/<hash>.webp` files in the client build.
 */
export function content(dir: string): Plugin {
  let cache: Content | undefined
  const load = () => (cache ??= loadContent(dir))
  return {
    name: "supply-content",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id === RESOLVED) return `export const items = ${JSON.stringify(load().items)}`
    },
    generateBundle() {
      if (this.environment.name !== "client") return
      for (const [url, file] of load().images) {
        this.emitFile({ type: "asset", fileName: url.slice(1), source: readFileSync(file) })
      }
    },
    configureServer(server) {
      server.watcher.add(dir)
      server.watcher.on("all", (_event, file) => {
        if (!path.resolve(file).startsWith(dir)) return
        cache = undefined
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph.getModuleById(RESOLVED)
          if (module) environment.moduleGraph.invalidateModule(module)
        }
        server.ws.send({ type: "full-reload" })
      })
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split("?")[0]
        if (!pathname?.startsWith("/images/")) return next()
        let file: string | undefined
        try {
          file = load().images.get(pathname)
        } catch {
          // Invalid content is reported by the page that imports it.
        }
        if (!file) return next()
        response.setHeader("Content-Type", "image/webp")
        response.end(readFileSync(file))
      })
    }
  }
}
