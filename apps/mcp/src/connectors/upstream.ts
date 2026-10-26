import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  auth,
  type OAuthClientMetadata,
  type OAuthClientProvider,
  type StoredOAuthClientInformation,
  type StoredOAuthTokens
} from "@modelcontextprotocol/client"
import {
  fromJsonSchema,
  type JsonSchemaType,
  type McpServer,
  type Tool
} from "@modelcontextprotocol/server"
import { type ToolResult, toolError } from "./result"

/**
 * Remote MCP servers the gateway signs into once (via /connect/<id>) and proxies as
 * <id>_<tool>. Their OAuth client registration and tokens live in OAUTH_KV.
 */
export const UPSTREAMS = {
  yc: { name: "YC", url: "https://api.ycombinator.com/v1/mcp" }
} as const

export type UpstreamId = keyof typeof UPSTREAMS

export const isUpstreamId = (id: string): id is UpstreamId => Object.hasOwn(UPSTREAMS, id)

const TOOLS_TTL = 60 * 60
const FLOW_TTL = 10 * 60

/** OAuthClientProvider backed by KV, one credential set per upstream. */
export class KvOAuthProvider implements OAuthClientProvider {
  /** Set by auth() when the user has to sign in; /connect redirects there. */
  authorizationUrl: URL | undefined

  constructor(
    private readonly id: UpstreamId,
    private readonly env: Env
  ) {}

  private key(name: string) {
    return `upstream:${this.id}:${name}`
  }

  get redirectUrl() {
    return `${this.env.PUBLIC_ORIGIN}/connect/${this.id}/callback`
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "alexandru.so MCP gateway",
      client_uri: this.env.PUBLIC_ORIGIN,
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    }
  }

  async state() {
    const state = crypto.randomUUID()
    await this.env.OAUTH_KV.put(this.key("state"), state, { expirationTtl: FLOW_TTL })
    return state
  }

  /** Single use: the stored state is deleted whether or not it matches. */
  async consumeState(given: string) {
    const stored = await this.env.OAUTH_KV.get(this.key("state"))
    await this.env.OAUTH_KV.delete(this.key("state"))
    return stored !== null && stored === given
  }

  clientInformation() {
    return this.env.OAUTH_KV.get<StoredOAuthClientInformation>(this.key("client"), "json").then(
      (value) => value ?? undefined
    )
  }

  async saveClientInformation(info: StoredOAuthClientInformation) {
    await this.env.OAUTH_KV.put(this.key("client"), JSON.stringify(info))
  }

  tokens() {
    return this.env.OAUTH_KV.get<StoredOAuthTokens>(this.key("tokens"), "json").then(
      (value) => value ?? undefined
    )
  }

  async saveTokens(tokens: StoredOAuthTokens) {
    await this.env.OAUTH_KV.put(this.key("tokens"), JSON.stringify(tokens))
    await this.env.OAUTH_KV.delete(this.key("tools"))
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url
  }

  async saveCodeVerifier(verifier: string) {
    await this.env.OAUTH_KV.put(this.key("verifier"), verifier, { expirationTtl: FLOW_TTL })
  }

  async codeVerifier() {
    const verifier = await this.env.OAUTH_KV.get(this.key("verifier"))
    if (!verifier) throw new Error("Sign-in expired. Start again.")
    return verifier
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    const names = {
      all: ["client", "tokens", "verifier", "tools"],
      client: ["client"],
      tokens: ["tokens", "tools"],
      verifier: ["verifier"],
      discovery: []
    }[scope]
    await Promise.all(names.map((name) => this.env.OAUTH_KV.delete(this.key(name))))
  }

  async cachedTools() {
    return (await this.env.OAUTH_KV.get<Tool[]>(this.key("tools"), "json")) ?? undefined
  }

  async cacheTools(tools: Tool[]) {
    await this.env.OAUTH_KV.put(this.key("tools"), JSON.stringify(tools), {
      expirationTtl: TOOLS_TTL
    })
  }
}

/** Starts or finishes the upstream sign-in; see src/connect.ts. */
export function authorizeUpstream(
  id: UpstreamId,
  provider: KvOAuthProvider,
  callback?: { code: string; iss?: string }
) {
  return auth(provider, {
    serverUrl: UPSTREAMS[id].url,
    authorizationCode: callback?.code,
    iss: callback?.iss
  })
}

async function connect(id: UpstreamId, provider: KvOAuthProvider) {
  const client = new Client({ name: "alexandru-mcp", version: "0.1.0" })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(UPSTREAMS[id].url), { authProvider: provider })
  )
  return client
}

/**
 * Registers an upstream's tools under `<id>_`. The tool list is cached in KV for an
 * hour so tools/list doesn't open an upstream session; tool calls always go live.
 * An upstream that was never connected, or whose sign-in lapsed, contributes no tools.
 */
export async function registerUpstream(server: McpServer, env: Env, id: UpstreamId) {
  const provider = new KvOAuthProvider(id, env)
  if (!(await provider.tokens())) return

  let tools = await provider.cachedTools()
  if (!tools) {
    try {
      const client = await connect(id, provider)
      tools = (await client.listTools()).tools
      await client.close()
      await provider.cacheTools(tools)
    } catch (error) {
      console.error(`upstream ${id}: listing tools failed`, error)
      return
    }
  }

  for (const tool of tools) {
    server.registerTool(
      `${id}_${tool.name}`,
      {
        title: tool.title ? `${UPSTREAMS[id].name}: ${tool.title}` : undefined,
        description: tool.description,
        inputSchema: fromJsonSchema(tool.inputSchema as JsonSchemaType),
        annotations: tool.annotations
      },
      async (args: unknown): Promise<ToolResult> => {
        try {
          const client = await connect(id, provider)
          try {
            return (await client.callTool({
              name: tool.name,
              arguments: args as Record<string, unknown>
            })) as ToolResult
          } finally {
            await client.close()
          }
        } catch (error) {
          if (error instanceof UnauthorizedError) {
            return toolError(
              `${UPSTREAMS[id].name} sign-in expired. Reconnect at ${env.PUBLIC_ORIGIN}/connect/${id}`
            )
          }
          return toolError(error)
        }
      }
    )
  }
}
