import { OAuthProvider } from "@cloudflare/workers-oauth-provider"
import { authorize } from "./authorize"
import { finishLogin, logout, startLogin } from "./auth"
import { connect } from "./connect"
import { privacy } from "./privacy"
import { mcpApi } from "./mcp"
import { SCOPE } from "./oauth"

let provider: OAuthProvider<Env> | undefined

/** Built on first request because the resource URL depends on PUBLIC_ORIGIN (localhost in dev). */
function createProvider(origin: string) {
  return new OAuthProvider<Env>({
    apiRoute: "/mcp",
    apiHandler: mcpApi,
    defaultHandler: {
      async fetch(request, env) {
        const { pathname } = new URL(request.url)
        if (pathname === "/authorize") return authorize(request, env)
        if (pathname === "/login/google") return startLogin(request, env)
        if (pathname === "/login/google/callback") return finishLogin(request, env)
        if (pathname === "/logout") return logout(request, env)
        const connected = await connect(request, env)
        if (connected) return connected
        if (pathname === "/privacy") return privacy()
        if (pathname === "/") return new Response(`MCP gateway. Connect to ${origin}/mcp\n`)
        return new Response("Not found", { status: 404 })
      }
    },
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/oauth/token",
    clientRegistrationEndpoint: "/oauth/register",
    clientIdMetadataDocumentEnabled: true,
    scopesSupported: [SCOPE],
    resourceMetadata: {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: [SCOPE],
      resource_name: "alexandru.so MCP gateway"
    },
    // A client stays signed in while it keeps refreshing at least once a month.
    refreshTokenTTL: 365 * 24 * 60 * 60,
    refreshTokenIdleTTL: 30 * 24 * 60 * 60
  })
}

export default {
  fetch(request, env, ctx) {
    provider ??= createProvider(env.PUBLIC_ORIGIN)
    return provider.fetch(request, env, ctx)
  }
} satisfies ExportedHandler<Env>
