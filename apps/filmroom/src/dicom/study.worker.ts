import createOpenJPEG, { type OpenJPEG } from "@cornerstonejs/codec-openjpeg/decodewasmjs"
import wasmUrl from "@cornerstonejs/codec-openjpeg/decodewasm?url"
import { decodeFrame } from "./jpeg2000"
import type { FrameInfo } from "./loader"
import { loadBundledStudy, type Study } from "./study"

export type StudyMessage =
  | { type: "progress"; message: string }
  | { type: "error"; message: string }
  | { type: "study"; study: Study }

let codec: Promise<OpenJPEG> | undefined
async function decodeJpeg2000(encoded: Uint8Array, expected: FrameInfo) {
  codec ??= createOpenJPEG({ locateFile: () => wasmUrl })
  return decodeFrame(await codec, encoded, expected)
}

const post = (message: StudyMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer })

self.onmessage = async ({ data: { baseUrl } }: MessageEvent<{ baseUrl: string }>) => {
  try {
    const study = await loadBundledStudy(
      async (path) => {
        const response = await fetch(new URL(path, baseUrl))
        if (!response.ok) throw new Error("An image could not be downloaded. Please try again.")
        return new Uint8Array(await response.arrayBuffer())
      },
      decodeJpeg2000,
      (message) => post({ type: "progress", message })
    )
    post(
      { type: "study", study },
      study.images.map((image) => image.pixels.buffer)
    )
  } catch (error) {
    post({
      type: "error",
      message: (error as Error).message || "Unable to open the bundled study."
    })
  }
}
