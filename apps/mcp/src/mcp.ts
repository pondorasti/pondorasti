import { env } from "cloudflare:workers"
import {
  McpServer,
  createMcpHandler,
  localhostAllowedOrigins,
  originValidationResponse
} from "@modelcontextprotocol/server"
import { registerHevy } from "./connectors/hevy"
import { UPSTREAMS, type UpstreamId, registerUpstream } from "./connectors/upstream"

export const SCOPE = "mcp"

/**
 * Services the gateway calls directly, with hand-written tools under their own prefix.
 * Remote MCP servers it proxies (YC, Notion) are listed in UPSTREAMS instead.
 */
const connectors = [registerHevy]

const handler = createMcpHandler(async () => {
  const server = new McpServer({ name: "alexandru-mcp", version: "0.1.0" })
  for (const register of connectors) register(server, env)
  // Upstreams that were never connected at /connect/<id> contribute no tools
  const upstreams = Object.keys(UPSTREAMS) as UpstreamId[]
  await Promise.all(upstreams.map((id) => registerUpstream(server, env, id)))
  return server
})

/**
 * Stateless: a fresh McpServer per request, behind the OAuth provider's token check.
 * Current-protocol clients and 2025-era clients (legacy: "stateless", the default)
 * are both served. Browser pages on other origins are refused, even with a token.
 */
export const mcpApi = {
  async fetch(request: Request) {
    if (new URL(request.url).pathname !== "/mcp") return new Response("Not found", { status: 404 })
    const rejected = originValidationResponse(request, localhostAllowedOrigins())
    if (rejected) return rejected
    return handler.fetch(request)
  }
}
