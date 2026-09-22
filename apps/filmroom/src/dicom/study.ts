import manifest from "./study.json"
import { parseImage, type DecodeJpeg2000, type DicomImage } from "./loader"

export const bundledStudy = manifest

export interface Study {
  title: string
  date: string
  images: DicomImage[]
}

export async function loadBundledStudy(
  readAsset: (path: string) => Promise<Uint8Array>,
  decodeJpeg2000: DecodeJpeg2000,
  progress: (message: string) => void = () => {}
): Promise<Study> {
  const images: DicomImage[] = []
  for (const source of manifest.images) {
    progress(`Opening ${source.name}…`)
    const bytes = await readAsset(source.file)
    const image = await parseImage(bytes, decodeJpeg2000)
    if (
      !image ||
      image.rows !== source.rows ||
      image.columns !== source.columns ||
      image.bits !== source.bits ||
      image.description !== source.description
    ) {
      throw new Error(`The ${source.name} image does not match the bundled study.`)
    }
    images.push({ ...image, name: source.name })
  }
  return { title: manifest.title, date: manifest.date, images }
}
