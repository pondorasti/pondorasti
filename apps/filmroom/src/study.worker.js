import createOpenJPEG from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import wasmUrl from '@cornerstonejs/codec-openjpeg/decodewasm?url';
import { decodeFrame } from './jpeg2000.js';
import { loadBundledStudy } from './study.js';

let codec;
async function decodeJpeg2000(encoded, expected) {
  codec ??= createOpenJPEG({ locateFile: () => wasmUrl });
  return decodeFrame(await codec, encoded, expected);
}

self.onmessage = async ({ data: { baseUrl } }) => {
  try {
    const study = await loadBundledStudy(async path => {
      const response = await fetch(new URL(path, baseUrl));
      if (!response.ok) throw new Error('An image could not be downloaded. Please try again.');
      return new Uint8Array(await response.arrayBuffer());
    }, decodeJpeg2000, message => self.postMessage({ type: 'progress', message }));
    self.postMessage({ type: 'study', study }, study.images.map(image => image.pixels.buffer));
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Unable to open the bundled study.' });
  }
};
