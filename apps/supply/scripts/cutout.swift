// Lifts the subject out of each image with macOS Vision (the same model as "Copy Subject" in
// Photos) and crops it to the subject plus a thin transparent border. Images that are already
// cut out are only cropped. Used by scripts/images.ts; macOS 14 or later.
//
//   swift scripts/cutout.swift <out-dir> <image>...
//
// Writes <out-dir>/<n>.png for the nth image that changed and prints "<n>\t<image>" for it.
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

/// Alpha at or below this counts as background when finding the subject's bounds.
let clear: UInt8 = 8
/// The transparent border left around the subject, as a share of its longer side.
let borderShare: CGFloat = 0.01

func pixels(_ image: CGImage) -> (data: [UInt8], width: Int, height: Int) {
  let width = image.width, height = image.height
  var data = [UInt8](repeating: 0, count: width * height * 4)
  let context = CGContext(
    data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return (data, width, height)
}

/// Whether the image has a background to remove: most of its outer edge is opaque. Images
/// already cut out only touch the edge where the subject runs off it.
func hasBackground(_ image: CGImage) -> Bool {
  let (data, width, height) = pixels(image)
  let edge = (0..<(width * height)).filter {
    $0 % width == 0 || $0 % width == width - 1 || $0 < width || $0 >= width * (height - 1)
  }
  return edge.filter { data[$0 * 4 + 3] > clear }.count * 2 > edge.count
}

/// The smallest rectangle holding every pixel that isn't background, in top-left origin.
func subjectBounds(_ image: CGImage) -> CGRect? {
  let (data, width, height) = pixels(image)
  var minX = width, minY = height, maxX = -1, maxY = -1
  for y in 0..<height {
    for x in 0..<width where data[(y * width + x) * 4 + 3] > clear {
      minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
    }
  }
  guard maxX >= 0 else { return nil }
  return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

/// Vision misses subjects that run off the frame, so the image is first framed with a margin
/// filled with its median edge color.
func lift(_ image: CGImage) throws -> CGImage? {
  let (data, width, height) = pixels(image)
  var edge: [[UInt8]] = [[], [], []]
  for i in 0..<(width * height) where i % width == 0 || i % width == width - 1 || i < width || i >= width * (height - 1) {
    for c in 0..<3 { edge[c].append(data[i * 4 + c]) }
  }
  let median = edge.map { CGFloat($0.sorted()[$0.count / 2]) / 255 }
  let margin = max(width, height) / 10
  let framedWidth = width + margin * 2, framedHeight = height + margin * 2
  let context = CGContext(
    data: nil, width: framedWidth, height: framedHeight, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.setFillColor(red: median[0], green: median[1], blue: median[2], alpha: 1)
  context.fill(CGRect(x: 0, y: 0, width: framedWidth, height: framedHeight))
  context.draw(image, in: CGRect(x: margin, y: margin, width: width, height: height))
  let framed = context.makeImage()!

  let handler = VNImageRequestHandler(cgImage: framed)
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])
  guard let observation = request.results?.first else { return nil }
  let mask = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
  return matte(framed, mask: mask, background: median.map { Float($0) })
}

/// Vision's mask fades over several pixels, and those pixels still carry the background, which
/// shows as a pale halo on a dark card. The edge is tightened to a couple of pixels and the
/// background color is taken back out of what remains.
func matte(_ image: CGImage, mask: CVPixelBuffer, background: [Float]) -> CGImage {
  var (data, width, height) = pixels(image)
  CVPixelBufferLockBaseAddress(mask, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
  let base = CVPixelBufferGetBaseAddress(mask)!
  let rowBytes = CVPixelBufferGetBytesPerRow(mask)
  for y in 0..<height {
    let row = (base + y * rowBytes).assumingMemoryBound(to: Float.self)
    for x in 0..<width {
      let i = (y * width + x) * 4
      let coverage = min(max(row[x], 0), 1)
      let alpha = min(max((coverage - 0.5) / 0.3, 0), 1)
      for c in 0..<3 {
        let observed = Float(data[i + c]) / 255
        let color = coverage > 0 ? (observed - (1 - coverage) * background[c]) / coverage : 0
        data[i + c] = UInt8((min(max(color, 0), 1) * alpha * 255).rounded())
      }
      data[i + 3] = UInt8((alpha * 255).rounded())
    }
  }
  let context = CGContext(
    data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  return context.makeImage()!
}

/// Fallback for subjects Vision can't find (e.g. cropped by the frame): clears the near-white
/// background connected to the image's edges.
func clearWhiteBackground(_ image: CGImage) -> CGImage? {
  var (data, width, height) = pixels(image)
  let isWhite = { (i: Int) in data[i * 4] >= 235 && data[i * 4 + 1] >= 235 && data[i * 4 + 2] >= 235 }
  var stack = (0..<(width * height)).filter {
    ($0 % width == 0 || $0 % width == width - 1 || $0 < width || $0 >= width * (height - 1)) && isWhite($0)
  }
  guard stack.count * 2 > (width + height) * 2 else { return nil }
  var seen = [Bool](repeating: false, count: width * height)
  while let i = stack.popLast() {
    guard !seen[i], isWhite(i) else { continue }
    seen[i] = true
    for c in 0..<4 { data[i * 4 + c] = 0 }
    let x = i % width
    if x > 0 { stack.append(i - 1) }
    if x < width - 1 { stack.append(i + 1) }
    if i >= width { stack.append(i - width) }
    if i < width * (height - 1) { stack.append(i + width) }
  }
  let context = CGContext(
    data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  return context.makeImage()
}

let arguments = CommandLine.arguments.dropFirst()
guard let outDir = arguments.first, arguments.count > 1 else {
  FileHandle.standardError.write("usage: cutout.swift <out-dir> <image>...\n".data(using: .utf8)!)
  exit(2)
}

for (index, path) in arguments.dropFirst().enumerated() {
  guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
    let original = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldAllowFloat: false] as CFDictionary)
  else {
    FileHandle.standardError.write("\(path): can't read\n".data(using: .utf8)!)
    continue
  }
  var image = original
  if hasBackground(original) {
    if let lifted = try lift(original) {
      image = lifted
    } else if let cleared = clearWhiteBackground(original) {
      FileHandle.standardError.write("\(path): no subject found, cleared the white background instead\n".data(using: .utf8)!)
      image = cleared
    } else {
      FileHandle.standardError.write("\(path): no subject found, left as is\n".data(using: .utf8)!)
      continue
    }
  }
  guard let bounds = subjectBounds(image) else { continue }
  // A thin transparent border keeps the edges clear, so a cropped boxy subject doesn't read as
  // a background on the next run, and an image that already has one is left alone.
  let border = max(2, Int((CGFloat(max(bounds.width, bounds.height)) * borderShare).rounded()))
  let gaps = [bounds.minX, bounds.minY, CGFloat(image.width) - bounds.maxX, CGFloat(image.height) - bounds.maxY]
  if image === original && gaps.allSatisfy({ $0 >= 1 && $0 <= CGFloat(border + 2) }) { continue }
  let width = Int(bounds.width) + border * 2, height = Int(bounds.height) + border * 2
  let context = CGContext(
    data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.draw(
    image.cropping(to: bounds)!,
    in: CGRect(x: border, y: border, width: Int(bounds.width), height: Int(bounds.height)))
  let output = URL(fileURLWithPath: outDir).appendingPathComponent("\(index).png")
  let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, context.makeImage()!, nil)
  guard CGImageDestinationFinalize(destination) else { fatalError("\(output.path): can't write") }
  print("\(index)\t\(path)")
}
