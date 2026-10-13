import path from "node:path"
import type { Plugin } from "vite"
import { type Content, loadContent } from "./load"

const ID = "virtual:macro-content"
const RESOLVED = `\0${ID}`

/** Exposes the validated CSVs in `content/` as `virtual:macro-content`, read by the server only. */
export function content(dir: string): Plugin {
  let cache: Content | undefined
  const load = () => (cache ??= loadContent(dir))
  return {
    name: "macro-content",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const { meals, weighIns } = load()
      return `export const meals = ${JSON.stringify(meals)}\nexport const weighIns = ${JSON.stringify(weighIns)}`
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
    }
  }
}
