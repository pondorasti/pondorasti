import dicomParser from "dicom-parser"
import { unzipSync } from "fflate"

export const LIMITS = {
  inputBytes: 256 * 1024 ** 2,
  expandedBytes: 256 * 1024 ** 2,
  fileBytes: 64 * 1024 ** 2,
  images: 96,
  imagePixels: 16_000_000,
  totalPixels: 48_000_000
}
const NATIVE = new Set(["1.2.840.10008.1.2", "1.2.840.10008.1.2.1", "1.2.840.10008.1.2.2"])
const JPEG2000 = new Set(["1.2.840.10008.1.2.4.90", "1.2.840.10008.1.2.4.91"])

export function safePath(path) {
  const normalized = path.replaceAll("\\", "/")
  if (
    normalized.startsWith("/") ||
    /^[a-z]:/i.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === ".")
  )
    throw new Error("The archive contains an unsafe file path.")
  return normalized
}
function candidate(path) {
  const leaf = path.split("/").pop()
  return (
    leaf &&
    !leaf.startsWith(".") &&
    !path.includes("__MACOSX/") &&
    (!leaf.includes(".") || /\.(dcm|dicom)$/i.test(leaf))
  )
}
export function isDicom(bytes) {
  return bytes.length >= 132 && String.fromCharCode(...bytes.subarray(128, 132)) === "DICM"
}
export function unpack(records) {
  if (records.reduce((sum, file) => sum + file.bytes.byteLength, 0) > LIMITS.inputBytes)
    throw new Error("Choose a study smaller than 256 MB.")
  const archives = records.filter((file) => /\.zip$/i.test(file.name))
  if (archives.length && records.length !== 1) throw new Error("Open one ZIP archive at a time.")
  if (!archives.length) {
    const files = records
      .filter((file) => candidate(file.name))
      .map((file) => ({ ...file, name: safePath(file.name) }))
    if (new Set(files.map((file) => file.name)).size !== files.length)
      throw new Error(
        "Files share the same name. Choose their containing folder or a ZIP to preserve paths."
      )
    return files
  }
  let expanded = 0
  const archive = unzipSync(archives[0].bytes, {
    filter: (entry) => {
      if (!candidate(entry.name)) return false
      safePath(entry.name)
      expanded += entry.originalSize
      if (entry.originalSize > LIMITS.fileBytes || expanded > LIMITS.expandedBytes)
        throw new Error("The expanded study is too large.")
      return true
    }
  })
  return Object.entries(archive).map(([name, bytes]) => ({ name, bytes }))
}
function number(ds, tag, fallback) {
  const text = ds.string(tag)?.split("\\")[0]
  const value = text == null || text.trim() === "" ? NaN : Number(text)
  return Number.isFinite(value) ? value : fallback
}
function string(ds, tag, fallback = "") {
  return ds.string(tag)?.trim() || fallback
}
function unsupported(condition, message) {
  if (condition) throw new Error(message)
}
function percentile(histogram, count, percentile) {
  const rank = Math.max(1, Math.ceil(count * percentile))
  let sum = 0
  for (let i = 0; i < histogram.length; i++) {
    sum += histogram[i]
    if (sum >= rank) return i
  }
  return histogram.length - 1
}

export async function parseImage(bytes, decodeJpeg2000) {
  if (!isDicom(bytes)) return null
  const ds = dicomParser.parseDicom(bytes)
  const pixelElement = ds.elements.x7fe00010
  if (!pixelElement) return null // DICOMDIR and non-image objects are retained for export.
  const rows = ds.uint16("x00280010"),
    columns = ds.uint16("x00280011")
  const count = rows * columns
  unsupported(
    !rows || !columns || count > LIMITS.imagePixels,
    "The image dimensions are invalid or exceed 16 megapixels."
  )
  const allocated = ds.uint16("x00280100"),
    bits = ds.uint16("x00280101")
  const signed = ds.uint16("x00280103") === 1
  const highBit = ds.uint16("x00280102")
  const photometric = string(ds, "x00280004")
  const shape = string(ds, "x20500020")
  unsupported(
    ![8, 16].includes(allocated) || !(bits >= 1 && bits <= allocated) || highBit !== bits - 1,
    "Only aligned 8-bit and 16-bit integer images are supported."
  )
  unsupported(
    ds.uint16("x00280002") !== 1 || !["MONOCHROME1", "MONOCHROME2"].includes(photometric),
    "Color images are not supported yet."
  )
  unsupported(number(ds, "x00280008", 1) !== 1, "Multi-frame images are not supported yet.")
  unsupported(
    ds.elements.x00283000 || ds.elements.x00283010 || ds.elements.x20500010,
    "Images with modality, VOI, or presentation LUT sequences are not supported yet."
  )
  unsupported(
    !["", "LINEAR"].includes(string(ds, "x00281056")),
    "Only LINEAR windowing is supported."
  )
  unsupported(
    shape && shape !== (photometric === "MONOCHROME1" ? "INVERSE" : "IDENTITY"),
    "This presentation LUT shape is not supported."
  )
  const syntax = string(ds, "x00020010")
  const slope = number(ds, "x00281053", 1),
    originalIntercept = number(ds, "x00281052", 0)
  unsupported(slope <= 0, "Only positive rescale slopes are supported.")
  let values
  if (NATIVE.has(syntax)) {
    const size = allocated / 8
    unsupported(
      pixelElement.length < count * size || pixelElement.dataOffset + count * size > bytes.length,
      "The pixel data is incomplete."
    )
    const buffer = new DataView(
      bytes.buffer,
      bytes.byteOffset + pixelElement.dataOffset,
      count * size
    )
    values = new Uint16Array(count)
    for (let i = 0; i < count; i++)
      values[i] =
        size === 1 ? buffer.getUint8(i) : buffer.getUint16(i * 2, syntax !== "1.2.840.10008.1.2.2")
  } else if (JPEG2000.has(syntax)) {
    const encoded = pixelElement.basicOffsetTable?.length
      ? dicomParser.readEncapsulatedImageFrame(ds, pixelElement, 0)
      : dicomParser.readEncapsulatedPixelDataFromFragments(
          ds,
          pixelElement,
          0,
          pixelElement.fragments.length
        )
    const result = await decodeJpeg2000(encoded, { rows, columns, bits, signed })
    unsupported(
      result.length !== count,
      "Decoded image dimensions do not match the DICOM metadata."
    )
    values = result
  } else throw new Error(`Unsupported transfer syntax: ${syntax || "unknown"}.`)

  const pixels = new Uint16Array(count),
    histogram = new Uint32Array(2 ** bits)
  const mask = 2 ** bits - 1,
    midpoint = 2 ** (bits - 1),
    offset = signed ? midpoint : 0
  const intercept = originalIntercept - offset * slope
  const paddingElement = ds.elements.x00280120
  const padding = paddingElement ? (signed ? ds.int16("x00280120") : ds.uint16("x00280120")) : null
  const paddingEnd = ds.elements.x00280121
    ? signed
      ? ds.int16("x00280121")
      : ds.uint16("x00280121")
    : padding
  let minimum = Infinity,
    maximum = -Infinity,
    histogramCount = 0
  for (let i = 0; i < count; i++) {
    const raw = values[i] & mask
    const native = signed && raw >= midpoint ? raw - 2 ** bits : raw
    const normalized = native + offset
    pixels[i] = normalized
    minimum = Math.min(minimum, normalized)
    maximum = Math.max(maximum, normalized)
    if (
      padding == null ||
      native < Math.min(padding, paddingEnd) ||
      native > Math.max(padding, paddingEnd)
    ) {
      histogram[normalized]++
      histogramCount++
    }
  }
  const minValue = minimum * slope + intercept,
    maxValue = maximum * slope + intercept
  const center = number(ds, "x00281050", (minValue + maxValue + 1) / 2)
  const width = number(ds, "x00281051", Math.max(1, maxValue - minValue + 1))
  unsupported(width < 1, "Window width must be at least one.")
  const autoLow =
    (histogramCount ? percentile(histogram, histogramCount, 0.01) : minimum) * slope + intercept
  const autoHigh =
    (histogramCount ? percentile(histogram, histogramCount, 0.99) : maximum) * slope + intercept
  const centerMin = Math.min(minValue, center),
    centerMax = Math.max(maxValue, center, centerMin + 1)
  return {
    id: string(ds, "x00080018"),
    studyUid: string(ds, "x0020000d"),
    title: string(ds, "x00081030", string(ds, "x00180015", "DICOM study")),
    date: string(ds, "x00080020"),
    name: string(ds, "x0008103e", "Image"),
    description: string(ds, "x0008103e", "DICOM image"),
    laterality: string(ds, "x00200062", string(ds, "x00200060")),
    series: number(ds, "x00200011", 0),
    instance: number(ds, "x00200013", 0),
    rows,
    columns,
    bits,
    pixels,
    center,
    width,
    slope,
    intercept,
    baseInvert: photometric === "MONOCHROME1",
    autoCenter: (autoLow + autoHigh + 1) / 2,
    autoWidth: Math.max(1, autoHigh - autoLow + 1),
    centerMin,
    centerMax,
    widthMax: Math.max(width * 2, (centerMax - centerMin + 1) * 2)
  }
}

export async function loadStudy(records, decodeJpeg2000, progress = () => {}) {
  const files = unpack(records)
  const images = [],
    originals = [],
    warnings = [],
    seen = new Set()
  let totalPixels = 0
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    progress(`Reading file ${i + 1} of ${files.length}…`)
    if (file.bytes.length > LIMITS.fileBytes)
      throw new Error("An image file exceeds the 64 MB limit.")
    if (!isDicom(file.bytes)) continue
    originals.push(file)
    try {
      const image = await parseImage(file.bytes, decodeJpeg2000)
      if (!image || (image.id && seen.has(image.id))) continue
      if (image.id) seen.add(image.id)
      images.push(image)
      totalPixels += image.rows * image.columns
    } catch (error) {
      warnings.push(`${file.name}: ${error.message || "Unable to decode this file."}`)
    }
    if (images.length > LIMITS.images || totalPixels > LIMITS.totalPixels)
      throw new Error("The study exceeds 96 images or 48 megapixels. Open a smaller selection.")
  }
  if (!images.length)
    throw new Error(
      warnings[0] ||
        "No supported DICOM images found. Choose original DICOM files, a folder, or a ZIP."
    )
  if (new Set(images.map((image) => image.studyUid)).size > 1)
    throw new Error("This selection contains multiple studies. Open one study at a time.")
  images.sort(
    (a, b) => a.series - b.series || a.instance - b.instance || a.name.localeCompare(b.name)
  )
  return { title: images[0].title, date: images[0].date, images, originals, warnings }
}
