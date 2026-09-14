import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { getCatalog, getProduct } from "../src/server/catalog"
import { assets, products, syncRuns, syncState } from "../src/server/schema"
import { runSync } from "../src/server/sync"
import type { HttpFetch } from "../src/server/runtime"
import { fakeClock, list, notionHttp, notionPage, paragraph, PNG, rich } from "./fixtures"

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
  test("renews the lease throughout a rate-limited metadata scan longer than its original TTL", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => notionPage(`p${i}`, { image: null }))
    const sync = setup(rows)
    const normal = sync.http.request.getMockImplementation()!
    const attempted = new Set<number>()
    const remainingLeases: number[] = []
    sync.http.request.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/query")) {
        const cursor = Number(JSON.parse(String(init?.body)).start_cursor ?? 0)
        if (!attempted.has(cursor)) {
          attempted.add(cursor)
          return new Response("Rate limited", { status: 429, headers: { "Retry-After": "60" } })
        }
        const [state] = await db.select().from(syncState)
        remainingLeases.push(state.leaseUntil - sync.clock.now())
        return Response.json(list([rows[cursor]], cursor < 4 ? String(cursor + 1) : null))
      }
      return normal(input, init)
    })
    expect(await sync.run()).toMatchObject({ status: "succeeded", scanned: 5 })
    expect(sync.clock.delays.filter((delay) => delay === 60_000)).toHaveLength(5)
    expect(remainingLeases).toHaveLength(5)
    expect(Math.min(...remainingLeases)).toBeGreaterThan(0)
  })

  test("stops an over-budget scan before publishing even while its lease is renewed", async () => {
    const sync = setup()
    const normal = sync.http.request.getMockImplementation()!
    let page = 0
    sync.http.request.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/query")) {
        sync.clock.advance(100_000)
        return Response.json(list([notionPage(`p${page++}`)], String(page)))
      }
      return normal(input, init)
    })
    await expect(sync.run()).rejects.toThrow("sync_time_budget")
    expect(await db.select().from(products)).toEqual([])
    expect((await db.select().from(syncState))[0].leaseOwner).toBeNull()
  })

  test("publishes 175 unique image assets across a paginated scan within D1 binding limits", async () => {
    const rows = Array.from({ length: 175 }, (_, i) =>
      notionPage(`p${i}`, { status: i < 15 ? "Retired" : i < 20 ? "Wishlist" : "Owned" })
    )
    const sync = setup(rows)
    const normal = sync.http.request.getMockImplementation()!
    sync.http.request.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/query")) {
        const body = JSON.parse(String(init?.body))
        return Response.json(
          body.start_cursor ? list(rows.slice(100)) : list(rows.slice(0, 100), "second")
        )
      }
      return normal(input, init)
    })
    sync.imageFetch.mockImplementation(async (input) => {
      const index = Number(new URL(String(input)).pathname.match(/p(\d+)\.png/)![1])
      return new Response(new Uint8Array([...PNG, index]))
    })
    expect(await sync.run()).toEqual({
      status: "succeeded",
      scanned: 175,
      changed: 175,
      uploaded: 175
    })
    expect(await db.select().from(assets)).toHaveLength(175)
    expect(await getCatalog(env.DB)).toHaveLength(160)
    expect((await db.select().from(syncState))[0]).toMatchObject({
      leaseOwner: null,
      lastSuccess: expect.any(Number)
    })
    sync.imageFetch.mockClear()
    expect((await sync.run()).changed).toBe(0)
    expect(sync.imageFetch).not.toHaveBeenCalled()
  })

  test("retiring and restoring an item changes public visibility without changing its URL", async () => {
    const rows = [notionPage()]
    const sync = setup(rows)
    await sync.run()
    const [before] = await getCatalog(env.DB)
    rows[0] = notionPage("p1", { status: "Retired", revision: "retired" })
    await sync.run()
    expect(await getCatalog(env.DB)).toEqual([])
    expect(await getProduct(env.DB, before.slug)).toBeNull()
    rows[0] = notionPage("p1", { status: "Wishlist", revision: "restored" })
    await sync.run()
    expect(await getProduct(env.DB, before.slug)).toMatchObject({ ownership: "Wishlist" })
  })

  test("force refresh repairs content missed by an unchanged Notion revision", async () => {
    const bodies = { p1: [paragraph("body", "Before")] }
    const sync = setup([notionPage()], bodies)
    await sync.run()
    bodies.p1 = [paragraph("body", "After")]
    expect((await sync.run()).changed).toBe(0)
    expect((await runSync(bindings, { ...sync.options, force: true })).changed).toBe(1)
    expect((await db.select().from(products))[0].body).toContain("After")
  })

  test("nested body images are copied before publication and captions survive", async () => {
    const image = {
      object: "block",
      id: "image",
      type: "image",
      has_children: false,
      image: {
        type: "file",
        file: { url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/body.png" },
        caption: [rich("Caption")]
      }
    }
    const sync = setup([notionPage()], { p1: [paragraph("parent", "Note", true)], parent: [image] })
    await sync.run()
    const [product] = await getCatalog(env.DB)
    const detail = await getProduct(env.DB, product.slug)
    const block = detail!.body[0].children[0]
    expect(block.text[0].text).toBe("Caption")
    expect(block.image).toBe(product.thumbnail)
    expect(await env.IMAGES.head(`images/${block.image}`)).not.toBeNull()
    expect(JSON.stringify(detail)).not.toContain("amazonaws.com")
  })

  test("deleting the lease row just before publication also rolls the transaction back", async () => {
    const normal = env.DB.batch.bind(env.DB)
    const batch = vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      await db.delete(syncState)
      return normal(statements)
    })
    try {
      await expect(setup().run()).rejects.toThrow("sync_failed")
      expect(await db.select().from(products)).toEqual([])
      expect(await db.select().from(assets)).toEqual([])
      expect(await db.select().from(syncState)).toEqual([])
    } finally {
      batch.mockRestore()
    }
  })

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
