import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"
import { type Content, loadContent } from "./load"

const ID = "virtual:supply-content"
const RESOLVED = `\0${ID}`

/**
 * Exposes `content/` as `virtual:supply-content` (validated items, read by the server only) and
 * ships the images as content-addressed `/images/<hash>.webp` files in the client build, next to
 * the Open Graph cards committed to `og/` (one per item and view, at `/og/<hash>.jpg`).
 */
export function content(dir: string, og: string): Plugin {
  let cache: Content | undefined
  const load = () => (cache ??= loadContent(dir))
  /** The committed file for a card URL, if the card is current. */
  const card = (url: string) => {
    const file = path.join(og, path.basename(url))
    return load().cards.has(url) && existsSync(file) ? file : undefined
  }
  return {
    name: "supply-content",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const { items, views } = load()
      return `export const items = ${JSON.stringify(items)}\nexport const views = ${JSON.stringify(views)}`
    },
    generateBundle() {
      if (this.environment.name !== "client") return
      const { images, cards } = load()
      const files = new Map(images)
      for (const url of cards.keys()) {
        const file = card(url)
        if (!file)
          throw new Error(`Open Graph card ${url} is missing from og/: run \`bun run images\``)
        files.set(url, file)
      }
      for (const [url, file] of files) {
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
        const kind = pathname?.startsWith("/og/")
          ? "og"
          : pathname?.startsWith("/images/")
            ? "images"
            : undefined
        if (!pathname || !kind) return next()
        let file: string | undefined
        try {
          file = kind === "og" ? card(pathname) : load().images.get(pathname)
        } catch {
          // Invalid content is reported by the page that imports it.
        }
        if (!file) return next()
        response.setHeader("Content-Type", kind === "og" ? "image/jpeg" : "image/webp")
        response.end(readFileSync(file))
      })
    }
  }
}
