import { describe, expect, test, vi } from "vite-plus/test"
import { safeLink } from "../src/catalog"
import { NotionSource } from "../src/server/notion"
import { sha256, type HttpFetch } from "../src/server/runtime"
import { fakeClock, list, notionHttp, notionPage, paragraph, rich, SOURCE_ID } from "./fixtures"

describe("Notion adapter", () => {
  test("scans all pages, including retired products, and uses the current API version", async () => {
    const http = notionHttp()
    http.request
      .mockImplementationOnce(async () => Response.json({ properties: notionPage().properties }))
      .mockImplementationOnce(async () => Response.json(list([notionPage("a")], "second")))
      .mockImplementationOnce(async (_input, init) => {
        expect(JSON.parse(init!.body as string).start_cursor).toBe("second")
        expect(new Headers(init?.headers).get("Notion-Version")).toBe("2026-03-11")
        return Response.json(list([notionPage("b", { status: "Retired" })]))
      })
    const rows = await new NotionSource("test", SOURCE_ID, {
      fetch: http.request,
      clock: fakeClock()
    }).scan()
    expect(rows.map((row) => row.ownership)).toEqual(["Owned", "Retired"])
    expect(http.request).toHaveBeenCalledTimes(3)
  })

  test("rejects schema drift even on an empty catalog", async () => {
    const request = vi.fn<HttpFetch>(async () => Response.json({ properties: {} }))
    await expect(
      new NotionSource("test", SOURCE_ID, { fetch: request, clock: fakeClock() }).scan()
    ).rejects.toThrow("notion_schema_changed")
  })

  test("rejects incomplete pagination and duplicate source rows", async () => {
    for (const response of [
      { ...list([notionPage()]), has_more: true },
      list([notionPage(), notionPage()])
    ]) {
      const http = notionHttp()
      http.request
        .mockImplementationOnce(async () => Response.json({ properties: notionPage().properties }))
        .mockImplementationOnce(async () => Response.json(response))
      await expect(
        new NotionSource("test", SOURCE_ID, { fetch: http.request, clock: fakeClock() }).scan()
      ).rejects.toThrow(response.has_more ? "invalid_notion_cursor" : "unstable_notion_scan")
    }
  })

  test("paginates nested block children and strips unsafe rich-text links", async () => {
    const request = vi
      .fn<HttpFetch>()
      .mockResolvedValueOnce(Response.json(list([paragraph("parent", "Notes", true)], "next")))
      .mockResolvedValueOnce(
        Response.json(
          list([
            {
              ...paragraph("child", "Nested"),
              paragraph: { rich_text: [rich("Nested", "javascript:alert(1)")] }
            }
          ])
        )
      )
      .mockResolvedValueOnce(Response.json(list([paragraph("tail", "More")])))
    const body = await new NotionSource("test", SOURCE_ID, {
      fetch: request,
      clock: fakeClock()
    }).body("page")
    expect(body.map((block) => block.id)).toEqual(["parent", "tail"])
    expect(body[0].children[0].text).toEqual([{ text: "Nested" }])
    expect(request).toHaveBeenCalledTimes(3)
  })

  test("honors Retry-After and throttles subsequent requests", async () => {
    const clock = fakeClock()
    const http = notionHttp()
    http.request.mockResolvedValueOnce(
      new Response("rate limited", { status: 429, headers: { "Retry-After": "3" } })
    )
    await new NotionSource("test", SOURCE_ID, { fetch: http.request, clock }).scan()
    expect(clock.delays).toContain(3000)
    expect(clock.delays).toContain(550)
    expect(http.request).toHaveBeenCalledTimes(3)
  })

  test("bounds retries and never shortens a Retry-After beyond its time budget", async () => {
    for (const seconds of ["0", "3600"]) {
      const request = vi.fn<HttpFetch>(
        async () => new Response("limited", { status: 429, headers: { "Retry-After": seconds } })
      )
      await expect(
        new NotionSource("test", SOURCE_ID, {
          fetch: request,
          clock: fakeClock(),
          retries: 2
        }).scan()
      ).rejects.toThrow(seconds === "0" ? "notion_retries_exhausted" : "notion_retry_budget")
      expect(request).toHaveBeenCalledTimes(seconds === "0" ? 3 : 1)
    }
  })

  test("does not retry authorization errors", async () => {
    const request = vi.fn<HttpFetch>(async () =>
      Response.json(
        { object: "error", status: 401, code: "unauthorized", message: "Unauthorized" },
        { status: 401 }
      )
    )
    await expect(
      new NotionSource("test", SOURCE_ID, { fetch: request, clock: fakeClock() }).scan()
    ).rejects.toThrow("Unauthorized")
    expect(request).toHaveBeenCalledTimes(1)
  })
})

test("hashes actual bytes deterministically", async () => {
  expect(await sha256("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  )
})

test("only allows public-facing HTTP links without embedded credentials", () => {
  expect(safeLink("https://example.com/item")).toBe("https://example.com/item")
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///private",
    "https://user:password@example.com",
    "/relative"
  ])
    expect(safeLink(url)).toBeUndefined()
})
