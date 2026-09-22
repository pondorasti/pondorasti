import type { OpenJPEG } from "@cornerstonejs/codec-openjpeg/decodewasmjs"
import type { FrameInfo } from "./loader"

// DICOM JPEG 2000 pixel data is a raw codestream, beginning with SOC and SIZ.
// Check its dimensions before handing it to the decoder (readHeader does not
// populate FrameInfo in the current OpenJPEG wrapper).
export function validateHeader(encoded: Uint8Array, expected: FrameInfo) {
  if (encoded.length < 45) throw new Error("Incomplete JPEG 2000 header.")
  const data = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
  const matches =
    data.getUint16(0) === 0xff4f &&
    data.getUint16(2) === 0xff51 &&
    data.getUint32(8) - data.getUint32(16) === expected.columns &&
    data.getUint32(12) - data.getUint32(20) === expected.rows &&
    data.getUint16(40) === 1 &&
    (data.getUint8(42) & 127) + 1 === expected.bits &&
    Boolean(data.getUint8(42) & 128) === expected.signed &&
    data.getUint8(43) === 1 &&
    data.getUint8(44) === 1
  if (!matches) throw new Error("JPEG 2000 header does not match the DICOM pixel format.")
}

export function decodeFrame(library: OpenJPEG, encoded: Uint8Array, expected: FrameInfo) {
  validateHeader(encoded, expected)
  const decoder = new library.J2KDecoder()
  try {
    decoder.getEncodedBuffer(encoded.length).set(encoded)
    decoder.decode()
    const info = decoder.getFrameInfo()
    if (
      info.width !== expected.columns ||
      info.height !== expected.rows ||
      info.componentCount !== 1 ||
      info.bitsPerSample !== expected.bits ||
      Boolean(info.isSigned) !== expected.signed
    )
      throw new Error("Decoded JPEG 2000 pixels do not match the DICOM metadata.")
    const copy = decoder.getDecodedBuffer().slice()
    return expected.bits > 8
      ? new Uint16Array(copy.buffer, copy.byteOffset, copy.byteLength / 2)
      : copy
  } finally {
    decoder.delete()
  }
}
