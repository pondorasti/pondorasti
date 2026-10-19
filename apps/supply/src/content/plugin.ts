import { readFileSync } from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"
import { type Content, loadContent } from "./load"
import { renderCard } from "./og"

const ID = "virtual:supply-content"
const RESOLVED = `\0${ID}`

/**
 * Exposes `content/` as `virtual:supply-content` (validated items, read by the server only) and
 * ships the images as content-addressed `/images/<hash>.webp` files in the client build, next to
 * an Open Graph card per item and view at `/og/<hash>.jpg`.
 */
export function content(dir: string): Plugin {
  let cache: Content | undefined
  // Dev renders each card on first request; content changes clear both caches.
  let rendered = new Map<string, Promise<Buffer>>()
  const load = () => (cache ??= loadContent(dir))
  const render = (url: string) => {
    const { cards, images } = load()
    const card = cards.get(url)
    if (!card) return undefined
    if (!rendered.has(url))
      rendered.set(
        url,
        renderCard(card, (image) => images.get(image))
      )
    return rendered.get(url)
  }
  return {
    name: "supply-content",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const { items, views } = load()
      return `export const items = ${JSON.stringify(items)}\nexport const views = ${JSON.stringify(views)}`
    },
    async generateBundle() {
      if (this.environment.name !== "client") return
      const { images, cards } = load()
      for (const [url, file] of images) {
        this.emitFile({ type: "asset", fileName: url.slice(1), source: readFileSync(file) })
      }
      // A few at a time: each render holds its decoded images in memory.
      const queue = [...cards.keys()]
      const worker = async () => {
        for (let url = queue.shift(); url; url = queue.shift()) {
          this.emitFile({ type: "asset", fileName: url.slice(1), source: await render(url)! })
        }
      }
      await Promise.all(Array.from({ length: 8 }, worker))
    },
    configureServer(server) {
      server.watcher.add(dir)
      server.watcher.on("all", (_event, file) => {
        if (!path.resolve(file).startsWith(dir)) return
        cache = undefined
        rendered = new Map()
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph.getModuleById(RESOLVED)
          if (module) environment.moduleGraph.invalidateModule(module)
        }
        server.ws.send({ type: "full-reload" })
      })
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split("?")[0]
        if (pathname?.startsWith("/og/")) {
          let card: Promise<Buffer> | undefined
          try {
            card = render(pathname)
          } catch {
            // Invalid content is reported by the page that imports it.
          }
          if (!card) return next()
          card.then(
            (jpeg) => {
              response.setHeader("Content-Type", "image/jpeg")
              response.end(jpeg)
            },
            (error: unknown) => next(error)
          )
          return
        }
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
