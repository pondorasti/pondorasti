import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vite-plus/test"
import { loadContent } from "./load"

describe("repo content", () => {
  it("loads both CSVs, sorted oldest first", () => {
    const { meals, weighIns } = loadContent(
      fileURLToPath(new URL("../../content", import.meta.url))
    )
    expect(meals.length).toBeGreaterThan(0)
    expect(weighIns.length).toBeGreaterThan(0)
    for (const rows of [meals, weighIns]) {
      const keys = rows.map((row) => `${row.date} ${row.time}`)
      expect(keys).toEqual([...keys].sort())
    }
  })
})
