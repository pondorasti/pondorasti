# MCP

One OAuth login at `https://mcp.alexandru.so/mcp` for the personal services I want
Claude (or any MCP client) to reach. A single Cloudflare Worker is both the OAuth
authorization server and the MCP server; the upstream credentials never leave it.

## How it works

- `src/worker.ts`: `@cloudflare/workers-oauth-provider` serves discovery, client
  registration (DCR and Client ID Metadata Documents), the token endpoint, and guards
  `/mcp`. Grants live in the `OAUTH_KV` namespace.
- `src/authorize.ts`: the consent page. It shows which app is asking and where the
  tokens go, then checks `LOGIN_PASSWORD` (rate-limited to 5 attempts/min per IP).
- `src/mcp.ts`: stateless MCP server (`agents/mcp/server` with MCP SDK v2). Each
  connector registers prefixed tools.
- `src/connectors/hevy.ts`: read-only Hevy tools, using `HEVY_API_KEY`.

To add a service, write `src/connectors/<name>.ts` exporting a `register<Name>(server, env)`
and add it to `connectors` in `src/mcp.ts`.

## Local development

```sh
cp .dev.vars.example .dev.vars   # fill in LOGIN_PASSWORD and HEVY_API_KEY
bun run dev                      # http://localhost:8787/mcp
```

`--local-upstream` keeps the request host as localhost; without it wrangler rewrites it
to the custom domain and OAuth discovery points at production.

## Deploy

```sh
bunx wrangler secret put LOGIN_PASSWORD   # long and random
bunx wrangler secret put HEVY_API_KEY
bun run deploy                            # first deploy also creates OAUTH_KV
```

Then in Claude: Settings → Connectors → Add custom connector → `https://mcp.alexandru.so/mcp`.
