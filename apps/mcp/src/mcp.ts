import { env } from "cloudflare:workers"
import {
  McpServer,
  createMcpHandler,
  localhostAllowedOrigins,
  originValidationResponse
} from "@modelcontextprotocol/server"
import { registerCalendar } from "./connectors/calendar"
import { registerGmail } from "./connectors/gmail"
import { isGoogleConnected } from "./connectors/google"
import { registerHevy } from "./connectors/hevy"
import { UPSTREAMS, type UpstreamId, registerUpstream } from "./connectors/upstream"

export const SCOPE = "mcp"

type Register = (server: McpServer, env: Env) => void | Promise<void>

/** Gmail and Calendar share one Google sign-in (/connect/google); without it, no tools. */
const registerGoogle: Register = async (server, env) => {
  if (!(await isGoogleConnected(env))) return
  registerGmail(server, env)
  registerCalendar(server, env)
}

/**
 * Services the gateway calls directly, with hand-written tools under their own prefix.
 * Remote MCP servers it proxies (YC, Notion) are listed in UPSTREAMS instead.
 */
const connectors: Register[] = [registerHevy, registerGoogle]

const handler = createMcpHandler(async () => {
  const server = new McpServer({ name: "alexandru-mcp", version: "0.1.0" })
  await Promise.all(connectors.map(async (register) => register(server, env)))
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
