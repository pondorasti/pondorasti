import { describe, expect, test } from "vite-plus/test"
import { zipSync } from "fflate"
import { fixture, noCodec, parsed } from "./fixture"
import { loadStudy, parseImage, safePath, unpack } from "./loader"
import { grayscale, lookup } from "./renderer"

describe("DICOM import", () => {
  test("preserves full 12-bit data and source window", async () => {
    const image = await parsed(fixture(), noCodec)
    expect([...image.pixels]).toEqual([0, 100, 2048, 4095])
    expect([...grayscale(image.pixels, lookup(image.center, image.width, false))]).toEqual([
      0, 6, 128, 255
    ])
  })
  test("applies signed pixels and rescale before windowing", async () => {
    const image = await parsed(
      fixture({ signed: true, pixels: [-2048, -1, 0, 2047], slope: 2, intercept: 10 }),
      noCodec
    )
    expect([...image.pixels].map((value) => value * image.slope + image.intercept)).toEqual([
      -4086, 8, 10, 4104
    ])
  })
  test("supports 8-bit and MONOCHROME1 polarity", async () => {
    const image = await parsed(
      fixture({
        allocated: 8,
        bits: 8,
        pixels: [0, 1, 127, 255],
        center: 128,
        width: 256,
        photometric: "MONOCHROME1",
        presentation: "INVERSE"
      }),
      noCodec
    )
    expect([
      ...grayscale(image.pixels, lookup(image.center, image.width, image.baseInvert))
    ]).toEqual([255, 254, 128, 0])
  })
  test("preserves original DICOM bytes and ignores viewer executables in ZIPs", async () => {
    const bytes = fixture()
    const zip = zipSync({
      "DICOM/IM000001": bytes,
      "Viewer/autorun.exe": new Uint8Array([1, 2, 3])
    })
    const study = await loadStudy([{ name: "study.zip", bytes: zip }], noCodec)
    expect(study.images).toHaveLength(1)
    expect(study.originals).toHaveLength(1)
    expect(study.originals[0].bytes).toEqual(bytes)
    expect(study.originals[0].name).toBe("DICOM/IM000001")
  })
  test("reports unsupported images while keeping supported ones", async () => {
    const study = await loadStudy(
      [
        { name: "one.dcm", bytes: fixture() },
        { name: "two.dcm", bytes: fixture({ frames: 3 }) }
      ],
      noCodec
    )
    expect(study.images).toHaveLength(1)
    expect(study.originals).toHaveLength(2)
    expect(study.warnings[0]).toContain("Multi-frame")
  })
  test("does not silently combine studies", async () => {
    await expect(
      loadStudy(
        [
          { name: "one.dcm", bytes: fixture() },
          { name: "two.dcm", bytes: fixture({ uid: "1.2.3.2", studyUid: "1.2.3.100" }) }
        ],
        noCodec
      )
    ).rejects.toThrow("multiple studies")
  })
  test.each<[Parameters<typeof fixture>[0], string]>([
    [{ photometric: "RGB" }, "Color"],
    [{ frames: 2 }, "Multi-frame"],
    [{ voiFunction: "SIGMOID" }, "LINEAR"],
    [{ width: 0 }, "width"],
    [{ rows: 65535, columns: 65535 }, "dimensions"],
    [{ presentation: "INVERSE" }, "presentation"],
    [{ slope: -1 }, "positive"],
    [{ pixels: [1] }, "incomplete"],
    [{ syntax: "1.2.3" }, "transfer syntax"]
  ])("rejects unsupported or malformed metadata: %p", async (options, error) => {
    await expect(parseImage(fixture(options), noCodec)).rejects.toThrow(error)
  })
  test("skips non-DICOM files and rejects empty selections", async () => {
    expect(await parseImage(new Uint8Array(20), noCodec)).toBeNull()
    await expect(loadStudy([], noCodec)).rejects.toThrow("No supported")
  })
  test("rejects ZIP traversal and multiple archives", () => {
    expect(() => safePath("../outside.dcm")).toThrow("unsafe")
    expect(() =>
      unpack([{ name: "bad.zip", bytes: zipSync({ "../outside.dcm": fixture() }) }])
    ).toThrow("unsafe")
    expect(() =>
      unpack([
        { name: "one.zip", bytes: new Uint8Array() },
        { name: "two.zip", bytes: new Uint8Array() }
      ])
    ).toThrow("one ZIP")
  })
  test("rejects duplicate file paths instead of losing originals on export", () => {
    expect(() =>
      unpack([
        { name: "image.dcm", bytes: fixture() },
        { name: "image.dcm", bytes: fixture() }
      ])
    ).toThrow("same name")
    expect(
      unpack([
        { name: "one/image.dcm", bytes: fixture() },
        { name: "two/image.dcm", bytes: fixture() }
      ])
    ).toHaveLength(2)
  })
})
