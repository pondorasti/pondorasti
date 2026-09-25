import { env } from "cloudflare:workers"
import { McpServer } from "@modelcontextprotocol/server"
import { createMcpHandler } from "agents/mcp/server"
import { registerHevy } from "./connectors/hevy"
import { UPSTREAMS, type UpstreamId, registerUpstream } from "./connectors/upstream"

export const SCOPE = "mcp"

/**
 * Services the gateway calls directly, with hand-written tools under their own prefix.
 * Remote MCP servers it proxies (YC, Notion) are listed in UPSTREAMS instead.
 */
const connectors = [registerHevy]

/** Stateless: a fresh McpServer per request, behind the OAuth provider's token check. */
export const mcpApi = {
  fetch: createMcpHandler(async () => {
    const server = new McpServer({ name: "alexandru-mcp", version: "0.1.0" })
    for (const register of connectors) register(server, env)
    // Upstreams that were never connected at /connect/<id> contribute no tools
    const upstreams = Object.keys(UPSTREAMS) as UpstreamId[]
    await Promise.all(upstreams.map((id) => registerUpstream(server, env, id)))
    return server
  })
}
