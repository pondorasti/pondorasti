import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { AssetStore, imageType, imageUrl } from "../src/server/assets"
import { NotionSource } from "../src/server/notion"
import type { HttpFetch } from "../src/server/runtime"
import { fakeClock, notionHttp, notionPage, PNG, requestUrl, SOURCE_ID } from "./fixtures"

const file = {
  url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/a.png?signature=old",
  ownerId: "a",
  ownerType: "page" as const
}

beforeEach(async () => {
  const objects = await env.IMAGES.list()
  if (objects.objects.length) await env.IMAGES.delete(objects.objects.map((object) => object.key))
})

describe("content-addressed images", () => {
  test("deduplicates an SVG-wrapped PNG with the same raw PNG", async () => {
    const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><image href="data:image/png;base64,${btoa(String.fromCharCode(...PNG))}" width="700" height="700"/></svg>`
    const request = vi
      .fn<HttpFetch>()
      .mockResolvedValueOnce(
        new Response(wrapper, { headers: { "Content-Type": "image/svg+xml" } })
      )
      .mockResolvedValueOnce(new Response(PNG))
    const store = new AssetStore(env.IMAGES, new NotionSource("test", SOURCE_ID), [], {
      fetch: request
    })
    const hash = await store.copy(file)
    expect(await store.copy(file)).toBe(hash)
    expect(store.added).toMatchObject([{ hash, size: PNG.length, contentType: "image/png" }])
    const object = await env.IMAGES.get(`images/${hash}`)
    expect(new Uint8Array(await object!.arrayBuffer())).toEqual(PNG)
    expect(object!.httpMetadata?.contentType).toBe("image/png")
  })

  test("deduplicates identical bytes across changing signed URLs and products", async () => {
    const source = new NotionSource("test", SOURCE_ID)
    const request = vi.fn<HttpFetch>(async () => new Response(PNG))
    const store = new AssetStore(env.IMAGES, source, [], { fetch: request })
    const first = await store.copy(file)
    const second = await store.copy({ ...file, url: file.url.replace("old", "new"), ownerId: "b" })
    expect(first).toBe(second)
    expect(store.uploaded).toBe(1)
    expect(store.added).toHaveLength(1)
    expect((await env.IMAGES.head(`images/${first}`))?.httpMetadata?.contentType).toBe("image/png")
    const nextRun = new AssetStore(env.IMAGES, source, store.added, { fetch: request })
    expect(await nextRun.copy(file)).toBe(first)
    expect(nextRun.uploaded).toBe(0)
  })

  test("reuses orphaned R2 uploads after an aborted publication", async () => {
    const source = new NotionSource("test", SOURCE_ID)
    const options = { fetch: vi.fn<HttpFetch>(async () => new Response(PNG)) }
    const first = new AssetStore(env.IMAGES, source, [], options)
    const hash = await first.copy(file)
    const retry = new AssetStore(env.IMAGES, source, [], options)
    expect(await retry.copy(file)).toBe(hash)
    expect(retry.uploaded).toBe(0)
    expect(retry.added).toHaveLength(1)
  })

  test("refreshes an expired Notion URL once", async () => {
    const http = notionHttp([notionPage("a", { image: file.url.replace("old", "fresh") })])
    const source = new NotionSource("test", SOURCE_ID, { fetch: http.request, clock: fakeClock() })
    const request = vi
      .fn<HttpFetch>()
      .mockResolvedValueOnce(new Response("expired", { status: 403 }))
      .mockImplementationOnce(async (url) => {
        expect(requestUrl(url).href).toContain("fresh")
        return new Response(PNG)
      })
    await new AssetStore(env.IMAGES, source, [], { fetch: request }).copy(file)
    expect(http.calls).toEqual(["/v1/pages/a"])
    expect(request).toHaveBeenCalledTimes(2)
  })

  test("checks every redirect target before fetching it", async () => {
    const request = vi.fn<HttpFetch>(
      async () =>
        new Response(null, { status: 302, headers: { Location: "https://127.0.0.1/secret" } })
    )
    await expect(
      new AssetStore(env.IMAGES, new NotionSource("test", SOURCE_ID), [], { fetch: request }).copy(
        file
      )
    ).rejects.toThrow("image_host_not_allowed")
    expect(request).toHaveBeenCalledTimes(1)
  })

  test("allows configured manufacturer hosts but still rejects untrusted redirects", async () => {
    const source = new NotionSource("test", SOURCE_ID)
    const external = { ...file, url: "https://isntree-global.com/cdn/shop/product.png" }
    const request = vi.fn<HttpFetch>(async () => new Response(PNG))
    const options = { fetch: request, allowedHosts: ["isntree-global.com"] }
    const store = new AssetStore(env.IMAGES, source, [], options)
    expect(await store.copy(external)).toMatch(/^[a-f0-9]{64}$/)
    request.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: "https://isntree-global.com.evil.example/product.png" }
      })
    )
    await expect(store.copy(external)).rejects.toThrow("image_host_not_allowed")
    expect(request).toHaveBeenCalledTimes(2)
  })

  test("rejects oversized streams, not just declared Content-Length", async () => {
    const request = vi.fn<HttpFetch>(async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1)))
    await expect(
      new AssetStore(env.IMAGES, new NotionSource("test", SOURCE_ID), [], { fetch: request }).copy(
        file
      )
    ).rejects.toThrow("image_size_limit")
  })
})

test("image downloads are HTTPS-only and restricted to trusted hosts", () => {
  for (const url of [
    "http://secure.notion-static.com/a",
    "https://evil.example/a",
    "https://secure.notion-static.com.evil.example/a",
    "https://u:p@secure.notion-static.com/a",
    "https://secure.notion-static.com:8443/a"
  ])
    expect(() => imageUrl(url)).toThrow("image_host_not_allowed")
})

test("rejects HTML and SVG even when served with an image MIME type", () => {
  expect(() => imageType(new TextEncoder().encode("<svg></svg>"))).toThrow(
    "unsupported_image_bytes"
  )
  expect(() => imageType(new TextEncoder().encode("<!doctype html>"))).toThrow(
    "unsupported_image_bytes"
  )
})
