import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { toolError, type ToolResult } from "./result"

const API = "https://api.notion.com/v1"
const VERSION = "2026-03-11"
const readOnly = { readOnlyHint: true, openWorldHint: true } as const
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const
const id = z
  .string()
  .regex(/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
const object = z.record(z.string(), z.unknown())
const pagination = {
  start_cursor: z
    .string()
    .min(1)
    .optional()
    .describe("Opaque next_cursor from the previous response"),
  page_size: z.number().int().min(1).max(100).default(25)
}

/** Keep Notion's null property values intact in tool responses. */
function call<A>(fn: (args: A) => Promise<unknown>) {
  return async (args: A): Promise<ToolResult> => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await fn(args)) }] }
    } catch (error) {
      return toolError(error)
    }
  }
}

/** The integration bot can access only pages explicitly shared with it, plus their children. */
export function registerNotion(server: McpServer, env: Pick<Env, "NOTION_TOKEN">) {
  if (!env.NOTION_TOKEN) return

  async function notion(
    path: string,
    init: {
      method?: "GET" | "POST" | "PATCH"
      body?: unknown
      query?: Record<string, string | number | undefined>
    } = {}
  ) {
    const url = new URL(`${API}${path}`)
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": VERSION,
        "Content-Type": "application/json"
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: "error",
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) {
      // A 404 deliberately does not distinguish a private page from a nonexistent page.
      if (response.status === 403 || response.status === 404) {
        throw new Error(
          `Notion ${response.status}: Access denied or resource not found. Check the integration's Content access and capabilities in Notion.`
        )
      }
      const retry = response.headers.get("Retry-After")
      const error = (await response.json().catch(() => null)) as { message?: unknown } | null
      const message =
        typeof error?.message === "string" ? error.message.slice(0, 300) : "Request failed."
      throw new Error(
        `Notion ${response.status}: ${message}${retry ? ` Retry after ${retry} seconds.` : ""}`
      )
    }
    return response.json()
  }

  server.registerTool(
    "notion_search",
    {
      title: "Search shared Notion pages",
      description:
        "Search titles of pages and data sources shared with the internal integration. Empty query lists accessible content. This is title search, not full-text or connected-app search.",
      inputSchema: z.object({
        query: z.string().default(""),
        filter: z
          .object({ property: z.literal("object"), value: z.enum(["page", "data_source"]) })
          .optional(),
        sort: z
          .object({
            direction: z.enum(["ascending", "descending"]),
            timestamp: z.literal("last_edited_time")
          })
          .optional(),
        ...pagination
      }),
      annotations: readOnly
    },
    call((body) => notion("/search", { method: "POST", body }))
  )

  server.registerTool(
    "notion_get_page",
    {
      title: "Get Notion page properties",
      description:
        "Page metadata and properties. Use notion_read_page for its content as markdown.",
      inputSchema: z.object({ page_id: id }),
      annotations: readOnly
    },
    call(({ page_id }) => notion(`/pages/${page_id}`))
  )

  server.registerTool(
    "notion_read_page",
    {
      title: "Read Notion page content",
      description:
        "Read an accessible page as markdown. Check truncated and unknown_block_ids; use notion_list_blocks to retrieve omitted blocks.",
      inputSchema: z.object({ page_id: id }),
      annotations: readOnly
    },
    call(({ page_id }) => notion(`/pages/${page_id}/markdown`))
  )

  server.registerTool(
    "notion_get_database",
    {
      title: "Get Notion database",
      description:
        "Database metadata and its data source IDs. Query individual data sources with notion_query_data_source.",
      inputSchema: z.object({ database_id: id }),
      annotations: readOnly
    },
    call(({ database_id }) => notion(`/databases/${database_id}`))
  )

  server.registerTool(
    "notion_get_data_source",
    {
      title: "Get Notion data source",
      description: "Data source properties and schema, for querying or creating database entries.",
      inputSchema: z.object({ data_source_id: id }),
      annotations: readOnly
    },
    call(({ data_source_id }) => notion(`/data_sources/${data_source_id}`))
  )

  server.registerTool(
    "notion_query_data_source",
    {
      title: "Query Notion data source",
      description:
        "List entries in an accessible data source. filter and sorts use Notion API property filter/sort objects. Follow next_cursor when has_more is true.",
      inputSchema: z.object({
        data_source_id: id,
        filter: object.optional(),
        sorts: z.array(object).optional(),
        ...pagination
      }),
      annotations: readOnly
    },
    call(({ data_source_id, ...body }) =>
      notion(`/data_sources/${data_source_id}/query`, { method: "POST", body })
    )
  )

  server.registerTool(
    "notion_get_block",
    {
      title: "Get Notion block",
      description:
        "Read one accessible content block. Blocks with has_children require notion_list_blocks.",
      inputSchema: z.object({ block_id: id }),
      annotations: readOnly
    },
    call(({ block_id }) => notion(`/blocks/${block_id}`))
  )

  server.registerTool(
    "notion_list_blocks",
    {
      title: "List Notion child blocks",
      description:
        "List a page's or block's immediate children. Follow next_cursor for more, and call again for blocks with has_children.",
      inputSchema: z.object({ block_id: id, ...pagination }),
      annotations: readOnly
    },
    call(({ block_id, ...query }) => notion(`/blocks/${block_id}/children`, { query }))
  )

  server.registerTool(
    "notion_create_page",
    {
      title: "Create Notion page",
      description:
        "Create a page under a shared page or data source. properties uses Notion API property objects; markdown supplies optional page content.",
      inputSchema: z.object({
        parent: z.union([z.strictObject({ page_id: id }), z.strictObject({ data_source_id: id })]),
        properties: object,
        markdown: z.string().optional()
      }),
      annotations: write
    },
    call((body) => notion("/pages", { method: "POST", body }))
  )

  server.registerTool(
    "notion_update_page",
    {
      title: "Update Notion page properties",
      description:
        "Update properties, icon, or cover of a shared page using Notion API objects. Use block tools to edit content.",
      inputSchema: z.object({
        page_id: id,
        properties: object.optional(),
        icon: object.nullable().optional(),
        cover: object.nullable().optional()
      }),
      annotations: { ...write, destructiveHint: true }
    },
    call(({ page_id, ...body }) => notion(`/pages/${page_id}`, { method: "PATCH", body }))
  )

  server.registerTool(
    "notion_append_blocks",
    {
      title: "Append Notion content blocks",
      description:
        "Append Notion API block objects to an accessible page or block. after optionally inserts after an existing child block.",
      inputSchema: z.object({
        block_id: id,
        children: z.array(object).min(1).max(100),
        after: id.optional()
      }),
      annotations: write
    },
    call(({ block_id, ...body }) =>
      notion(`/blocks/${block_id}/children`, { method: "PATCH", body })
    )
  )

  server.registerTool(
    "notion_update_block",
    {
      title: "Update Notion content block",
      description:
        "Update a shared block with a Notion API block update object, e.g. {paragraph: {rich_text: [{text: {content: 'New text'}}]}}. Replaces the supplied block fields.",
      inputSchema: z.object({ block_id: id, block: object }),
      annotations: { ...write, destructiveHint: true }
    },
    call(({ block_id, block }) => notion(`/blocks/${block_id}`, { method: "PATCH", body: block }))
  )
}
