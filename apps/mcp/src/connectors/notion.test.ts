import { Client, InMemoryTransport } from "@modelcontextprotocol/client"
import { McpServer } from "@modelcontextprotocol/server"
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test"
import { registerNotion } from "./notion"

const pageId = "12345678-1234-4234-8234-123456789abc"
const cursor = "cursor/with+opaque=characters"
let client: Client
let server: McpServer
let request: ReturnType<typeof vi.fn<typeof fetch>>

beforeEach(async () => {
  request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ object: "page", id: pageId }))
  vi.stubGlobal("fetch", request)
  server = new McpServer({ name: "notion-test", version: "1.0.0" })
  registerNotion(server, { NOTION_TOKEN: "ntn_test_internal_connection" })
  client = new Client({ name: "test", version: "1.0.0" })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
})

afterEach(async () => {
  await client.close()
  await server.close()
  vi.unstubAllGlobals()
})

test("Notion page requests use only the internal token and the fixed Notion API origin", async () => {
  const result = await client.callTool({ name: "notion_get_page", arguments: { page_id: pageId } })
  expect(result.isError).not.toBe(true)
  const [url, init] = request.mock.calls[0]
  expect((url as URL).href).toBe(`https://api.notion.com/v1/pages/${pageId}`)
  expect(init).toMatchObject({
    headers: {
      Authorization: "Bearer ntn_test_internal_connection",
      "Notion-Version": "2026-03-11"
    },
    redirect: "manual"
  })
})

test.each([403, 404])(
  "unshared pages return an MCP error for Notion %s without an OAuth fallback",
  async (status) => {
    request.mockResolvedValue(Response.json({ message: "restricted page" }, { status }))
    const result = await client.callTool({
      name: "notion_read_page",
      arguments: { page_id: pageId }
    })
    expect(result).toMatchObject({
      isError: true,
      content: [
        { type: "text", text: expect.stringContaining("Access denied or resource not found") }
      ]
    })
    expect(request).toHaveBeenCalledTimes(1)
  }
)

test("URL-shaped IDs are rejected before any request can leave the gateway", async () => {
  const result = await client.callTool({
    name: "notion_get_page",
    arguments: { page_id: "https://other.example/secret" }
  })
  expect(result.isError).toBe(true)
  expect(request).not.toHaveBeenCalled()
})

test("unexpected redirects fail without forwarding the integration token", async () => {
  request.mockResolvedValue(
    new Response(null, { status: 302, headers: { Location: "https://other.example/" } })
  )
  const result = await client.callTool({ name: "notion_get_page", arguments: { page_id: pageId } })
  expect(result).toMatchObject({
    isError: true,
    content: [{ text: expect.stringContaining("Notion 302") }]
  })
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0][1]?.redirect).toBe("manual")
})

test("opaque pagination cursors survive both GET and POST requests", async () => {
  await client.callTool({
    name: "notion_list_blocks",
    arguments: { block_id: pageId, start_cursor: cursor }
  })
  const [url] = request.mock.calls[0]
  expect((url as URL).searchParams.get("start_cursor")).toBe(cursor)
  await client.callTool({
    name: "notion_query_data_source",
    arguments: {
      data_source_id: pageId,
      start_cursor: cursor,
      filter: { property: "Done", checkbox: { equals: false } }
    }
  })
  const [queryUrl, init] = request.mock.calls[1]
  expect((queryUrl as URL).href).toBe(`https://api.notion.com/v1/data_sources/${pageId}/query`)
  expect(JSON.parse(init?.body as string)).toEqual({
    start_cursor: cursor,
    page_size: 25,
    filter: { property: "Done", checkbox: { equals: false } }
  })
})

test("nested writes preserve nulls used to clear properties", async () => {
  await client.callTool({
    name: "notion_update_page",
    arguments: { page_id: pageId, properties: { Score: { number: null } }, icon: null }
  })
  const [, init] = request.mock.calls[0]
  expect(init?.method).toBe("PATCH")
  expect(JSON.parse(init?.body as string)).toEqual({
    properties: { Score: { number: null } },
    icon: null
  })
})

test("page responses retain null property values", async () => {
  request.mockResolvedValue(Response.json({ properties: { Score: { number: null } } }))
  const result = await client.callTool({ name: "notion_get_page", arguments: { page_id: pageId } })
  expect(result).toMatchObject({
    content: [{ type: "text", text: JSON.stringify({ properties: { Score: { number: null } } }) }]
  })
})

test("rate limits report retry timing without replaying writes", async () => {
  request.mockResolvedValue(Response.json({}, { status: 429, headers: { "Retry-After": "5" } }))
  const result = await client.callTool({
    name: "notion_append_blocks",
    arguments: {
      block_id: pageId,
      children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [] } }]
    }
  })
  expect(result).toMatchObject({
    isError: true,
    content: [{ text: expect.stringContaining("Retry after 5 seconds") }]
  })
  expect(request).toHaveBeenCalledTimes(1)
})
