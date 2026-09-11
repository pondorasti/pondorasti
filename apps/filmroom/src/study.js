import manifest from './study.json';
import { parseImage } from './loader.js';

export const bundledStudy = manifest;

export async function loadBundledStudy(readAsset, decodeJpeg2000, progress = () => {}) {
  const images = [];
  for (const source of manifest.images) {
    progress(`Opening ${source.name}…`);
    const bytes = await readAsset(source.file);
    const image = await parseImage(bytes, decodeJpeg2000);
    if (!image || image.rows !== source.rows || image.columns !== source.columns || image.bits !== source.bits || image.description !== source.description) {
      throw new Error(`The ${source.name} image does not match the bundled study.`);
    }
    images.push({ ...image, name: source.name });
  }
  return { title: manifest.title, date: manifest.date, images };
}
