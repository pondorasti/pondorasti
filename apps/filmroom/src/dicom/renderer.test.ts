import { describe, expect, test } from "vite-plus/test"
import { gray } from "./renderer"

describe("DICOM display", () => {
  test("handles exact LINEAR boundaries and width-one threshold", () => {
    expect(gray(0, 2048, 4096)).toBe(0)
    expect(gray(4095, 2048, 4096)).toBe(255)
    expect(gray(2048, 2048, 4096)).toBe(128)
    expect(gray(9, 10, 1)).toBe(0)
    expect(gray(10, 10, 1)).toBe(255)
  })
})
