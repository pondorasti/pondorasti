import { describe, expect, it } from "vite-plus/test"
import { label } from "./product"

describe("label", () => {
  it("capitalizes an id and spaces its hyphens", () => {
    expect(label("technology")).toBe("Technology")
  })

  it("uses an override where the id alone can't give the name", () => {
    expect(label("carry-accessories")).toBe("Accessories")
  })
})
