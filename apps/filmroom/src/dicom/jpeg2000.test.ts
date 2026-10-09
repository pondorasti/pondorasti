import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { describe, expect, test } from "vite-plus/test"
import OpenJPEG from "@cornerstonejs/codec-openjpeg/decodewasmjs"
import { fixture, parsed } from "./fixture"
import { decodeFrame, validateHeader } from "./jpeg2000"

const require = createRequire(import.meta.url)

describe("JPEG 2000", () => {
  test("decodes lossless JPEG 2000 without losing 16-bit precision", async () => {
    const library = await OpenJPEG({
      wasmBinary: await readFile(require.resolve("@cornerstonejs/codec-openjpeg/decodewasm")),
      print: () => {}
    })
    const encoded = await readFile(new URL("./gradient.j2k", import.meta.url))
    const image = await parsed(
      fixture({ rows: 16, columns: 16, bits: 16, encoded, syntax: "1.2.840.10008.1.2.4.90" }),
      (bytes, expected) => decodeFrame(library, bytes, expected)
    )
    expect([...image.pixels]).toEqual(Array.from({ length: 256 }, (_, i) => i * 257))
    expect(() =>
      validateHeader(encoded, { rows: 32, columns: 16, bits: 16, signed: false })
    ).toThrow("header")
  })
})
