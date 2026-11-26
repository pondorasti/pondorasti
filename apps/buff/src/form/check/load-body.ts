/* Load public/models/body.glb outside the browser (tests, scripts). Textures are stripped
   first: geometry and skin are all the checks need, and Node can't decode images. */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js"

const MODEL = fileURLToPath(new URL("../../../public/models/body.glb", import.meta.url))

export function stripTextures(glb: Uint8Array): ArrayBuffer {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  const jsonLen = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLen)))
  delete json.images
  delete json.textures
  delete json.samplers
  delete json.extensionsRequired
  delete json.extensionsUsed
  for (const m of json.materials ?? []) {
    delete m.normalTexture
    delete m.occlusionTexture
    delete m.emissiveTexture
    if (m.pbrMetallicRoughness) {
      delete m.pbrMetallicRoughness.baseColorTexture
      delete m.pbrMetallicRoughness.metallicRoughnessTexture
    }
  }
  let text = JSON.stringify(json)
  while (text.length % 4) text += " "
  const jsonBytes = new TextEncoder().encode(text)
  const rest = glb.subarray(20 + jsonLen) // BIN chunk, unchanged
  const out = new Uint8Array(12 + 8 + jsonBytes.length + rest.length)
  const o = new DataView(out.buffer)
  out.set(glb.subarray(0, 12))
  o.setUint32(8, out.length, true)
  o.setUint32(12, jsonBytes.length, true)
  o.setUint32(16, 0x4e4f534a, true) // "JSON"
  out.set(jsonBytes, 20)
  out.set(rest, 20 + jsonBytes.length)
  return out.buffer
}

export function loadBody(): Promise<GLTF> {
  const buf = stripTextures(new Uint8Array(readFileSync(MODEL)))
  return new GLTFLoader().parseAsync(buf, "")
}
