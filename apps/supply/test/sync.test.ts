import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { getCatalog, getProduct } from "../src/server/catalog"
import { assets, products, syncRuns, syncState } from "../src/server/schema"
import { runSync } from "../src/server/sync"
import type { HttpFetch } from "../src/server/runtime"
import { fakeClock, list, notionHttp, notionPage, paragraph, PNG } from "./fixtures"

const bindings = { ...env, NOTION_TOKEN: "test-token" }
const db = drizzle(env.DB)

beforeEach(async () => {
  await db.delete(products)
  await db.delete(assets)
  await db.delete(syncRuns)
  await db.delete(syncState)
  const objects = await env.IMAGES.list()
  if (objects.objects.length) await env.IMAGES.delete(objects.objects.map((object) => object.key))
})

function setup(rows = [notionPage()], bodies: Record<string, unknown[]> = {}) {
  const http = notionHttp(rows, bodies)
  const imageFetch = vi.fn<HttpFetch>(async () => new Response(PNG))
  const clock = fakeClock()
  const options = { fetch: http.request, imageFetch, clock }
  return { http, imageFetch, clock, options, run: () => runSync(bindings, options) }
}

describe("atomic Notion mirror", () => {
  test("mirrors every status but only exposes non-retired products", async () => {
    const sync = setup([
      notionPage("a"),
      notionPage("b", { status: "Retired" }),
      notionPage("c", { status: "Wishlist" })
    ])
    expect(await sync.run()).toEqual({ status: "succeeded", scanned: 3, changed: 3, uploaded: 1 })
    expect(await db.select().from(products)).toHaveLength(3)
    expect((await getCatalog(env.DB)).map((product) => product.ownership)).toEqual([
      "Owned",
      "Wishlist"
    ])
    const [retired] = await db.select().from(products).where(eq(products.id, "b"))
    expect(await getProduct(env.DB, retired.slug)).toBeNull()
    expect((await getCatalog(env.DB))[0]).not.toHaveProperty("sourceProperties")
  })

  test("unchanged sync does not fetch bodies or images or rewrite products", async () => {
    const sync = setup()
    await sync.run()
    const before = await db.select().from(products)
    sync.http.calls.length = 0
    sync.imageFetch.mockClear()
    sync.clock.advance(300_000)
    expect(await sync.run()).toEqual({ status: "succeeded", scanned: 1, changed: 0, uploaded: 0 })
    expect(sync.http.calls).toHaveLength(2)
    expect(sync.imageFetch).not.toHaveBeenCalled()
    expect(await db.select().from(products)).toEqual(before)
  })

  test("body and title edits preserve URLs and reuse unchanged image bytes", async () => {
    const rows = [notionPage()]
    const bodies = { p1: [paragraph("block", "Old note")] }
    const sync = setup(rows, bodies)
    await sync.run()
    const [before] = await db.select().from(products)
    rows[0] = notionPage("p1", { name: "New title", revision: "2026-09-14T00:00:00Z" })
    bodies.p1 = [paragraph("block", "New note")]
    expect((await sync.run()).uploaded).toBe(0)
    const [after] = await db.select().from(products)
    expect(after.slug).toBe(before.slug)
    expect(after.thumbnail).toBe(before.thumbnail)
    expect(after.body).toContain("New note")
  })

  test("new image bytes get a new key; old objects remain available", async () => {
    const rows = [notionPage()]
    const sync = setup(rows)
    await sync.run()
    const [before] = await db.select().from(products)
    rows[0] = notionPage("p1", { revision: "2026-09-14T00:00:00Z" })
    sync.imageFetch.mockImplementation(async () => new Response(new Uint8Array([...PNG, 5])))
    expect((await sync.run()).uploaded).toBe(1)
    const [after] = await db.select().from(products)
    expect(after.thumbnail).not.toBe(before.thumbnail)
    expect(await env.IMAGES.head(`images/${before.thumbnail}`)).not.toBeNull()
  })

  test("failed pagination cannot remove existing rows", async () => {
    const sync = setup([notionPage("a"), notionPage("b")])
    await sync.run()
    const before = await db.select().from(products)
    sync.http.request
      .mockResolvedValueOnce(Response.json({ properties: notionPage().properties }))
      .mockResolvedValueOnce(Response.json(list([notionPage("a")], "second")))
      .mockRejectedValueOnce(new Error("network failure"))
    await expect(sync.run()).rejects.toThrow("sync_failed")
    expect(await db.select().from(products)).toEqual(before)
  })

  test("a later body failure preserves every previously published product", async () => {
    const rows = [notionPage("a"), notionPage("b")]
    const sync = setup(rows)
    await sync.run()
    const before = await db.select().from(products)
    rows[0] = notionPage("a", { name: "Changed", revision: "new" })
    rows[1] = notionPage("b", { revision: "new" })
    const normal = sync.http.request.getMockImplementation()!
    sync.http.request.mockImplementation(async (input, init) => {
      if (String(input).includes("/blocks/b/")) throw new Error("body unavailable")
      return normal(input, init)
    })
    await expect(sync.run()).rejects.toThrow("sync_failed")
    expect(await db.select().from(products)).toEqual(before)
  })

  test("successful deletion and restoration preserve the original slug", async () => {
    const rows = [notionPage()]
    const sync = setup(rows)
    await sync.run()
    const [before] = await db.select().from(products)
    rows.splice(0)
    await sync.run()
    expect(await getCatalog(env.DB)).toEqual([])
    expect(await getProduct(env.DB, before.slug)).toBeNull()
    rows.push(notionPage())
    sync.imageFetch.mockClear()
    await sync.run()
    expect((await getCatalog(env.DB))[0].slug).toBe(before.slug)
    expect(sync.imageFetch).not.toHaveBeenCalled()
  })

  test("concurrent runs cannot both acquire the lease", async () => {
    const sync = setup()
    const results = await Promise.all([sync.run(), sync.run()])
    expect(results.map((result) => result.status).sort()).toEqual(["skipped", "succeeded"])
  })

  test("an expired worker cannot overwrite the newer publisher", async () => {
    const old = setup([notionPage("p1", { name: "Old" })])
    const newer = setup([notionPage("p1", { name: "New" })])
    old.imageFetch.mockImplementationOnce(async () => {
      old.clock.advance(200_000)
      newer.clock.advance(200_000)
      expect((await newer.run()).status).toBe("succeeded")
      return new Response(PNG)
    })
    await expect(old.run()).rejects.toThrow("sync_lease_lost")
    expect((await getCatalog(env.DB))[0].name).toBe("New")
  })

  test("the publication transaction rejects a lost fence without partial writes", async () => {
    const sync = setup()
    const normalBatch = env.DB.batch.bind(env.DB)
    const batch = vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      await env.DB.prepare(
        "UPDATE sync_state SET fence = fence + 1, lease_owner = 'new-owner'"
      ).run()
      return normalBatch(statements)
    })
    try {
      await expect(sync.run()).rejects.toThrow("sync_failed")
      expect(await db.select().from(products)).toEqual([])
      expect(await db.select().from(assets)).toEqual([])
      expect((await db.select().from(syncState))[0].leaseOwner).toBe("new-owner")
    } finally {
      batch.mockRestore()
    }
  })

  test("R2 failures never publish database references to missing objects", async () => {
    const put = vi.spyOn(env.IMAGES, "put").mockRejectedValueOnce(new Error("R2 unavailable"))
    try {
      await expect(setup().run()).rejects.toThrow("sync_failed")
      expect(await getCatalog(env.DB)).toEqual([])
      expect(await db.select().from(assets)).toEqual([])
    } finally {
      put.mockRestore()
    }
  })

  test("D1 failure rolls back the whole catalog while uploaded R2 objects can be reused", async () => {
    const sync = setup([notionPage("a"), notionPage("b")])
    await env.DB.exec(
      "CREATE TRIGGER fail_second_product BEFORE INSERT ON products WHEN NEW.id = 'b' BEGIN SELECT RAISE(ABORT, 'injected failure'); END;"
    )
    try {
      await expect(sync.run()).rejects.toThrow("sync_failed")
      expect(await db.select().from(products)).toEqual([])
      expect(await db.select().from(assets)).toEqual([])
      expect((await db.select().from(syncState))[0].lastSuccess).toBeNull()
    } finally {
      await env.DB.exec("DROP TRIGGER fail_second_product")
    }
    expect((await sync.run()).uploaded).toBe(0)
    expect(await getCatalog(env.DB)).toHaveLength(2)
  })
})
