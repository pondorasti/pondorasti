import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import OpenJPEG from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import { bundledStudy, loadBundledStudy } from '../src/study.js';
import { decodeFrame } from '../src/jpeg2000.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readAsset = async path => new Uint8Array(await Bun.file(new URL(`../public/${path}`, import.meta.url)).arrayBuffer());

test('bundled originals and archive remain byte-identical', async () => {
  const archive = await readAsset(bundledStudy.archive.file);
  expect(hash(archive)).toBe(bundledStudy.archive.sha256);
  const files = unzipSync(archive);
  expect(Object.keys(files)).toHaveLength(5);
  expect(files).toHaveProperty('DICOMDIR');
  for (const source of bundledStudy.images) {
    const bytes = await readAsset(source.file);
    expect(hash(bytes)).toBe(source.sourceHash);
    expect(bytes).toEqual(files[source.file.slice('study/'.length)]);
  }
});

test('all four bundled images match the independent pydicom pixel reference', async () => {
  const library = await OpenJPEG({ wasmBinary: new Uint8Array(await Bun.file(new URL(import.meta.resolve('@cornerstonejs/codec-openjpeg/decodewasm'))).arrayBuffer()), print: () => {} });
  const study = await loadBundledStudy(readAsset, (encoded, expected) => decodeFrame(library, encoded, expected));
  expect(study.images).toHaveLength(4);
  expect(study.images.map(image => image.name)).toEqual(['Grashey', 'External', 'Y View', 'Axillary']);
  for (const [index, image] of study.images.entries()) {
    expect(hash(new Uint8Array(image.pixels.buffer))).toBe(bundledStudy.images[index].pixelHash);
  }
});
