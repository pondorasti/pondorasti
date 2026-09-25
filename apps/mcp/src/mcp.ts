import { env } from "cloudflare:workers"
import { McpServer } from "@modelcontextprotocol/server"
import { createMcpHandler } from "agents/mcp/server"
import { registerHevy } from "./connectors/hevy"

export const SCOPE = "mcp"

/** Each connector registers its tools under its own prefix (hevy_*, gmail_*, notion_*). */
const connectors = [registerHevy]

/** Stateless: a fresh McpServer per request, behind the OAuth provider's token check. */
export const mcpApi = {
  fetch: createMcpHandler(() => {
    const server = new McpServer({ name: "alexandru-mcp", version: "0.1.0" })
    for (const register of connectors) register(server, env)
    return server
  })
}
