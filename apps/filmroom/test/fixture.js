// Synthetic Part 10 records. No patient data or clinical images are used.
const u16 = (value) => {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(value)
  return b
}
const u32 = (value) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(value)
  return b
}
function element(group, tag, vr, value) {
  let bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value))
  if (bytes.length % 2)
    bytes = Buffer.concat([
      bytes,
      Buffer.from([vr === "UI" || vr === "OB" || vr === "OW" ? 0 : 32])
    ])
  return Buffer.concat([
    u16(group),
    u16(tag),
    Buffer.from(vr),
    ...(["OB", "OW", "SQ", "UN"].includes(vr) ? [u16(0), u32(bytes.length)] : [u16(bytes.length)]),
    bytes
  ])
}
export function fixture({
  pixels = [0, 100, 2048, 4095],
  rows = 2,
  columns = 2,
  bits = 12,
  allocated = 16,
  signed = false,
  photometric = "MONOCHROME2",
  width = 4096,
  center = 2048,
  slope = 1,
  intercept = 0,
  frames = 1,
  uid = "1.2.826.0.1.3680043.10.543.1",
  studyUid = "1.2.826.0.1.3680043.10.543.100",
  syntax = "1.2.840.10008.1.2.1",
  encoded = null,
  voiFunction = "LINEAR",
  presentation = ""
} = {}) {
  const header = Buffer.alloc(132)
  header.write("DICM", 128)
  let pixelData
  if (encoded) {
    const data = encoded.length % 2 ? Buffer.concat([encoded, Buffer.from([0])]) : encoded
    pixelData = Buffer.concat([
      u16(0x7fe0),
      u16(0x0010),
      Buffer.from("OB"),
      u16(0),
      u32(0xffffffff),
      u16(0xfffe),
      u16(0xe000),
      u32(0),
      u16(0xfffe),
      u16(0xe000),
      u32(data.length),
      data,
      u16(0xfffe),
      u16(0xe0dd),
      u32(0)
    ])
  } else {
    const bytes = Buffer.alloc((pixels.length * allocated) / 8)
    pixels.forEach((value, i) =>
      allocated === 8 ? bytes.writeUInt8(value & 255, i) : bytes.writeUInt16LE(value & 65535, i * 2)
    )
    pixelData = element(0x7fe0, 0x0010, allocated === 8 ? "OB" : "OW", bytes)
  }
  return new Uint8Array(
    Buffer.concat([
      header,
      element(2, 0x10, "UI", syntax),
      element(8, 0x18, "UI", uid),
      element(8, 0x1030, "LO", "Synthetic study"),
      element(8, 0x103e, "LO", "Test image"),
      element(0x20, 0x0d, "UI", studyUid),
      element(0x28, 2, "US", u16(1)),
      element(0x28, 4, "CS", photometric),
      element(0x28, 8, "IS", frames),
      element(0x28, 0x10, "US", u16(rows)),
      element(0x28, 0x11, "US", u16(columns)),
      element(0x28, 0x100, "US", u16(allocated)),
      element(0x28, 0x101, "US", u16(bits)),
      element(0x28, 0x102, "US", u16(bits - 1)),
      element(0x28, 0x103, "US", u16(signed ? 1 : 0)),
      element(0x28, 0x1050, "DS", center),
      element(0x28, 0x1051, "DS", width),
      element(0x28, 0x1052, "DS", intercept),
      element(0x28, 0x1053, "DS", slope),
      element(0x28, 0x1056, "CS", voiFunction),
      ...(presentation ? [element(0x2050, 0x20, "CS", presentation)] : []),
      pixelData
    ])
  )
}
