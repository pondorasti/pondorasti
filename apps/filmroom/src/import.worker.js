import createOpenJPEG from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import wasmUrl from '@cornerstonejs/codec-openjpeg/decodewasm?url';
import { loadStudy, LIMITS } from './loader.js';
import { decodeFrame } from './jpeg2000.js';

let codec;
async function decodeJpeg2000(encoded, expected) {
  codec ??= createOpenJPEG({ locateFile: () => wasmUrl });
  return decodeFrame(await codec, encoded, expected);
}

self.onmessage = async ({ data: files }) => {
  try {
    if (files.reduce((sum, file) => sum + file.size, 0) > LIMITS.inputBytes) throw new Error('Choose a study smaller than 256 MB.');
    const records = [];
    for (const file of files) records.push({ name: file.webkitRelativePath || file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    const study = await loadStudy(records, decodeJpeg2000, message => self.postMessage({ type: 'progress', message }));
    const buffers = new Set([...study.images.map(image => image.pixels.buffer), ...study.originals.map(file => file.bytes.buffer)]);
    self.postMessage({ type: 'study', study }, [...buffers]);
  } catch (error) { self.postMessage({ type: 'error', message: error.message || 'Unable to open this study.' }); }
};
