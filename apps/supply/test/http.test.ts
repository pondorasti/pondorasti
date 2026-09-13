import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import { beforeEach, expect, test, vi } from "vitest"
import { handleApi, scheduledSync } from "../src/server/http"
import { products, syncRuns, syncState } from "../src/server/schema"
import { runSync } from "../src/server/sync"
import type { HttpFetch } from "../src/server/runtime"
import { fakeClock, notionHttp, notionPage, PNG } from "./fixtures"

const bindings = { ...env, NOTION_TOKEN: "test", SYNC_SECRET: "test-secret" }
const options = () => ({
  fetch: notionHttp([notionPage("owned"), notionPage("retired", { status: "Retired" })]).request,
  imageFetch: vi.fn<HttpFetch>(async () => new Response(PNG)),
  clock: fakeClock()
})
const request = (path: string, init?: RequestInit) =>
  new Request(`https://alexandru.supply${path}`, init)

beforeEach(async () => {
  const db = drizzle(env.DB)
  await db.delete(products)
  await db.delete(syncState)
  await db.delete(syncRuns)
})

test("manual sync and operational status require a bearer secret", async () => {
  for (const method of ["GET", "POST"]) {
    expect((await handleApi(request("/api/sync", { method }), bindings))?.status).toBe(401)
    expect(
      (
        await handleApi(
          request("/api/sync", { method, headers: { Authorization: "Bearer wrong" } }),
          bindings
        )
      )?.status
    ).toBe(401)
  }
  const result = await handleApi(
    request("/api/sync", { method: "POST", headers: { Authorization: "Bearer test-secret" } }),
    bindings,
    options()
  )
  expect(await result?.json()).toMatchObject({ status: "succeeded", scanned: 2 })
  const status = await handleApi(
    request("/api/sync", { headers: { Authorization: "Bearer test-secret" } }),
    bindings
  )
  expect(await status?.json()).toMatchObject({
    state: { lastSuccess: expect.any(Number) },
    runs: [{ status: "succeeded" }]
  })
})

test("missing configuration fails closed without exposing secrets", async () => {
  const response = await handleApi(
    request("/api/sync", { method: "POST", headers: { Authorization: "Bearer test-secret" } }),
    { ...bindings, NOTION_TOKEN: undefined }
  )
  expect(response?.status).toBe(503)
  expect(await response?.json()).toEqual({ error: "notion_token_missing" })
})

test("catalog, details and sitemap all exclude retired items and make no Notion calls", async () => {
  await runSync(bindings, options())
  const dbRows = await drizzle(env.DB).select().from(products)
  const retired = dbRows.find((product) => product.ownership === "Retired")!
  const network = vi.fn<HttpFetch>(() => {
    throw new Error("Unexpected visitor network request")
  })
  vi.stubGlobal("fetch", network)
  try {
    const catalog = await handleApi(request("/api/catalog"), bindings)
    expect(await catalog?.json()).toHaveLength(1)
    expect((await handleApi(request(`/api/products/${retired.slug}`), bindings))?.status).toBe(404)
    const sitemap = await handleApi(request("/sitemap.xml"), bindings)
    expect(await sitemap?.text()).not.toContain(retired.slug)
    expect(network).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

test("images have stable caching, MIME, HEAD and conditional GET", async () => {
  await runSync(bindings, options())
  const [product] = await drizzle(env.DB).select().from(products)
  const path = `/images/${product.thumbnail}`
  const response = await handleApi(request(path), bindings)
  expect(response?.headers.get("Content-Type")).toBe("image/png")
  expect(response?.headers.get("Cache-Control")).toContain("immutable")
  expect(new Uint8Array(await response!.arrayBuffer())).toEqual(PNG)
  const head = await handleApi(request(path, { method: "HEAD" }), bindings)
  expect(await head?.text()).toBe("")
  const cached = await handleApi(
    request(path, { headers: { "If-None-Match": response!.headers.get("ETag")! } }),
    bindings
  )
  expect(cached?.status).toBe(304)
  expect((await handleApi(request("/images/not-a-hash"), bindings))?.status).toBe(404)
})

test("cron runs the actual sync service", async () => {
  const output = vi.spyOn(console, "info").mockImplementation(() => {})
  try {
    await scheduledSync(bindings, options())
    expect((await drizzle(env.DB).select().from(syncRuns))[0].status).toBe("succeeded")
    expect(output).toHaveBeenCalledWith(expect.stringContaining('"scanned":2'))
  } finally {
    output.mockRestore()
  }
})

test("wrong methods are rejected and page routes fall through to Start", async () => {
  expect((await handleApi(request("/api/catalog", { method: "POST" }), bindings))?.status).toBe(405)
  expect(await handleApi(request("/items/example"), bindings)).toBeNull()
})
