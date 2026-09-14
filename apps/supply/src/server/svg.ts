import { DOMParser, type Element, type Node } from "@xmldom/xmldom"
import { SyncError } from "./runtime"

const SVG = "http://www.w3.org/2000/svg"
const XLINK = "http://www.w3.org/1999/xlink"
const unsupported = () => new SyncError("unsupported_image_bytes")

function children(node: Node) {
  return Array.from(node.childNodes).filter(
    (child) => child.nodeType !== 8 && !(child.nodeType === 3 && !child.textContent?.trim())
  )
}

function attributes(element: Element, allowed: string[]) {
  if (Array.from(element.attributes).some((attribute) => !allowed.includes(attribute.name)))
    throw unsupported()
}

// Some Notion thumbnails are a single embedded bitmap inside an otherwise empty SVG.
// Unwrap only that exact shape; never interpret SVG drawing, scripts, or remote resources.
export function unwrapRasterSvg(bytes: ArrayBuffer): ArrayBuffer {
  try {
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw unsupported()
    const document = new DOMParser({
      onError: () => {
        throw unsupported()
      }
    }).parseFromString(xml, "image/svg+xml")
    const root = document.documentElement
    if (!root || root.localName !== "svg" || root.namespaceURI !== SVG || document.doctype)
      throw unsupported()
    attributes(root, ["xmlns", "xmlns:xlink", "width", "height", "viewBox"])
    if (
      Array.from(document.childNodes).some(
        (node) =>
          node !== root &&
          node.nodeType !== 8 &&
          !(node.nodeType === 3 && !node.textContent?.trim()) &&
          !(node.nodeType === 7 && node.nodeName === "xml")
      )
    )
      throw unsupported()
    const nodes = children(root)
    if (nodes.length !== 1 || nodes[0].nodeType !== 1) throw unsupported()
    const image = nodes[0] as Element
    if (image.localName !== "image" || image.namespaceURI !== SVG || children(image).length)
      throw unsupported()
    attributes(image, ["href", "xlink:href", "width", "height", "x", "y", "preserveAspectRatio"])
    const aspectRatio = image.getAttribute("preserveAspectRatio")
    if (aspectRatio !== null && aspectRatio !== "xMidYMid meet") throw unsupported()
    const width = Number(root.getAttribute("width"))
    const height = Number(root.getAttribute("height"))
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      Number(image.getAttribute("width")) !== width ||
      Number(image.getAttribute("height")) !== height ||
      Number(image.getAttribute("x")) !== 0 ||
      Number(image.getAttribute("y")) !== 0
    )
      throw unsupported()
    const viewBox = root.getAttribute("viewBox")
    if (viewBox) {
      const values = viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      if (values.length !== 4 || values.some((value, i) => value !== [0, 0, width, height][i]))
        throw unsupported()
    }
    const href = image.getAttribute("href")
    const xlink = image.getAttributeNS(XLINK, "href")
    if (href && xlink) throw unsupported()
    const data = (href || xlink || "").match(
      /^data:image\/(?:png|jpeg|gif|webp|avif);base64,([A-Za-z0-9+/]*={0,2})$/
    )?.[1]
    if (!data || data.length % 4 !== 0) throw unsupported()
    return Uint8Array.from(atob(data), (character) => character.charCodeAt(0)).buffer
  } catch {
    throw unsupported()
  }
}
