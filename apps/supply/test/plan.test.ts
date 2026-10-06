import { describe, expect, test, vi } from "vite-plus/test"
import type { SourceProduct } from "../src/sync/notion/map"
import { planUpdates, slugFor, type PlanOptions, type Product } from "../src/sync/plan"
import { fakeClock } from "./fixtures"

const row = (id: string, overrides: Partial<SourceProduct> = {}): SourceProduct => ({
  id,
  name: `Product ${id}`,
  link: null,
  ownership: "Owned",
  tags: [],
  revision: "r1",
  properties: "{}",
  ...overrides
})

const stored = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  slug: `stored-${id}`,
  name: `Product ${id}`,
  link: null,
  ownership: "Owned",
  tags: [],
  thumbnail: null,
  body: "[]",
  sourceProperties: "{}",
  sourceRevision: "r1",
  contentHash: "hash",
  updatedAt: 0,
  removedAt: null,
  ...overrides
})

function options(overrides: Partial<PlanOptions> = {}) {
  return {
    clock: fakeClock(),
    checkpoint: vi.fn<PlanOptions["checkpoint"]>(async () => {}),
    copy: vi.fn<PlanOptions["copy"]>(async () => ({ body: "[]", thumbnail: null })),
    ...overrides
  }
}

describe("planUpdates", () => {
  test("unchanged revisions skip content copies and produce no writes", async () => {
    const plan = options()
    expect(await planUpdates([row("a")], [stored("a")], plan)).toEqual([])
    expect(plan.copy).not.toHaveBeenCalled()
    expect(plan.checkpoint).toHaveBeenCalledTimes(1)
  })

  test("an unchanged tombstoned row is restored as-is without copying content", async () => {
    const plan = options()
    const [restored] = await planUpdates([row("a")], [stored("a", { removedAt: 5 })], plan)
    expect(restored).toMatchObject({ slug: "stored-a", removedAt: null, contentHash: "hash" })
    expect(plan.copy).not.toHaveBeenCalled()
  })

  test("force refreshes unchanged revisions", async () => {
    const plan = options({ force: true })
    expect(await planUpdates([row("a")], [stored("a")], plan)).toHaveLength(1)
    expect(plan.copy).toHaveBeenCalledOnce()
  })

  test("edits keep the stored slug while new rows get a generated one", async () => {
    const updates = await planUpdates(
      [row("a", { name: "Renamed", revision: "r2" }), row("b", { name: "New thing" })],
      [stored("a")],
      options()
    )
    expect(updates.map((product) => product.slug)).toEqual([
      "stored-a",
      await slugFor("New thing", "b")
    ])
    expect(updates[0].name).toBe("Renamed")
  })

  test("the content hash covers the copied body and thumbnail", async () => {
    const plan = (thumbnail: string) => options({ copy: async () => ({ body: "[]", thumbnail }) })
    const [first] = await planUpdates([row("a")], [], plan("one"))
    const [second] = await planUpdates([row("a")], [], plan("two"))
    expect(first.contentHash).not.toBe(second.contentHash)
  })

  test("oversized products fail the whole plan", async () => {
    const plan = options({ copy: async () => ({ body: "x".repeat(500_001), thumbnail: null }) })
    await expect(planUpdates([row("a")], [], plan)).rejects.toMatchObject({
      code: "catalog_size_limit"
    })
  })

  test("a failing checkpoint stops before any further content is copied", async () => {
    const plan = options({
      checkpoint: vi.fn<PlanOptions["checkpoint"]>().mockRejectedValue(new Error("lease lost"))
    })
    await expect(planUpdates([row("a")], [], plan)).rejects.toThrow("lease lost")
    expect(plan.copy).not.toHaveBeenCalled()
  })
})

describe("slugFor", () => {
  test("is readable, ASCII and suffixed with a stable id hash", async () => {
    const slug = await slugFor("Crème Brûlée — Torch!", "page-id")
    expect(slug).toMatch(/^creme-brulee-torch-[a-f0-9]{12}$/)
    expect(await slugFor("Something else", "page-id")).toMatch(slug.slice(-12))
  })

  test("falls back for names without slug characters and caps the length", async () => {
    expect(await slugFor("日本", "x")).toMatch(/^item-[a-f0-9]{12}$/)
    expect((await slugFor("a".repeat(200), "x")).length).toBe(80 + 13)
  })
})
