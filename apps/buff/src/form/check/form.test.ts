/* Every movement in the catalog must be physically plausible at every sampled frame.
   FORM_REPORT=1 prints the full summary instead of failing on the first movement. */
import { beforeAll, describe, expect, it } from "vite-plus/test"
import type { GLTF } from "three/addons/loaders/GLTFLoader.js"
import { movements } from "../catalog"
import { checkMovement, summarize } from "./check"
import { loadBody } from "./load-body"

let gltf: GLTF
beforeAll(async () => {
  gltf = await loadBody()
})

describe("form movements are physically plausible", () => {
  it.each(movements.map((m) => [m.id, m] as const))("%s", (_id, m) => {
    const lines = summarize(checkMovement(gltf.scene, m, { step: 0.02 }))
    if (process.env.FORM_REPORT) console.log(`\n${m.id}\n  ${lines.join("\n  ") || "ok"}`)
    expect(lines).toEqual([])
  })
})
