import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { expect, test } from "vite-plus/test"
import { createHash } from "node:crypto"
import { unzipSync } from "fflate"
import OpenJPEG from "@cornerstonejs/codec-openjpeg/decodewasmjs"
import { bundledStudy, loadBundledStudy } from "~/dicom/study"
import { decodeFrame } from "~/dicom/jpeg2000"

const require = createRequire(import.meta.url)
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")
const readAsset = async (path: string) =>
  new Uint8Array(await readFile(new URL(`../public/${path}`, import.meta.url)))

test("bundled originals and archive remain byte-identical", async () => {
  const archive = await readAsset(bundledStudy.archive.file)
  expect(hash(archive)).toBe(bundledStudy.archive.sha256)
  const files = unzipSync(archive)
  expect(Object.keys(files)).toHaveLength(5)
  expect(files).toHaveProperty("DICOMDIR")
  for (const source of bundledStudy.images) {
    const bytes = await readAsset(source.file)
    expect(hash(bytes)).toBe(source.sourceHash)
    expect(hash(files[source.file.slice("study/".length)])).toBe(source.sourceHash)
  }
})

test("all four bundled images match the independent pydicom pixel reference", async () => {
  const library = await OpenJPEG({
    wasmBinary: await readFile(require.resolve("@cornerstonejs/codec-openjpeg/decodewasm")),
    print: () => {}
  })
  const study = await loadBundledStudy(readAsset, (encoded, expected) =>
    decodeFrame(library, encoded, expected)
  )
  expect(study.images).toHaveLength(4)
  expect(study.images.map((image) => image.name)).toEqual([
    "Grashey",
    "External",
    "Y View",
    "Axillary"
  ])
  for (const [index, image] of study.images.entries()) {
    expect(hash(new Uint8Array(image.pixels.buffer))).toBe(bundledStudy.images[index].pixelHash)
  }
})
