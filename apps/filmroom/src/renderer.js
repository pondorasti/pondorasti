const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
// DICOM PS3.3 C.11.2 LINEAR windowing (the half-pixel offsets are intentional).
function gray(value, center, width, invert = false) {
  width = Math.max(1, width);
  const level = center - 0.5;
  const g = width === 1 ? (value <= level ? 0 : 255)
    : Math.round(clamp((value - level) / (width - 1) + 0.5, 0, 1) * 255);
  return invert ? 255 - g : g;
}
function lookup(center, width, invert, slope = 1, intercept = 0) {
  const table = new Uint8Array(65536);
  for (let n = 0; n < table.length; n++) table[n] = gray(n * slope + intercept, center, width, invert);
  return table;
}
function grayscale(pixels, table) {
  const result = new Uint8Array(pixels.length);
  for (let n = 0; n < pixels.length; n++) result[n] = table[pixels[n]];
  return result;
}
export { clamp, gray, lookup, grayscale };
