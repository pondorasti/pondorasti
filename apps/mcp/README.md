# MCP

One OAuth login at `https://mcp.alexandru.so/mcp` for the personal services I want
Claude (or any MCP client) to reach. A single Cloudflare Worker is both the OAuth
authorization server and the MCP server; the upstream credentials never leave it.

## How it works

- `src/worker.ts`: `@cloudflare/workers-oauth-provider` serves discovery, client
  registration (DCR and Client ID Metadata Documents), the token endpoint, and guards
  `/mcp`. Grants live in the `OAUTH_KV` namespace.
- `src/authorize.ts`: the consent page. It shows which app is asking and where the
  tokens go, then requires the owner's Google session before approving access.
- `src/auth.ts`: Google OpenID Connect sign-in, restricted to `LOGIN_GOOGLE_EMAIL`.
  It verifies Google's signature, issuer, audience, nonce, token expiry, and verified
  email. Login flows use PKCE and a browser-bound state cookie. Browser sessions
  last eight hours; session identifiers are stored hashed in `OAUTH_KV`.
- `src/mcp.ts`: stateless MCP server (`createMcpHandler` from MCP SDK v2). Each
  connector registers prefixed tools.
- `src/connectors/hevy.ts`: read-only Hevy tools, using `HEVY_API_KEY`.
- `src/connectors/notion.ts`: Notion API tools using the `NOTION_TOKEN` internal
  integration secret. Notion enforces access to explicitly shared pages and their
  children; the gateway never signs into the hosted Notion MCP service.
- `src/connectors/google.ts`: one Google sign-in for Gmail and Calendar, using the
  OAuth client in the `alexandru-mcp` Google Cloud project. Client credentials are
  Cloudflare secrets; account tokens stay in `OAUTH_KV`.
- `src/connectors/upstream.ts`: remote MCP servers the gateway proxies as `<id>_<tool>`
  (YC and Robinhood). The gateway is their OAuth client: sign in once at `/connect/<id>`
  (after signing in with Google) and the registration and tokens stay in `OAUTH_KV`. Tool
  lists are cached there for an hour; calls always go live.

To add an API-key service, write `src/connectors/<name>.ts` exporting a
`register<Name>(server, env)` and add it to `connectors` in `src/mcp.ts`. To add a remote
MCP server, add its URL to `UPSTREAMS` in `src/connectors/upstream.ts`.

## Local development

```sh
cp .dev.vars.example .dev.vars   # fill in the gateway and service credentials
bun run dev                      # http://localhost:8787/mcp
```

`--local-upstream` keeps the request host as localhost; without it wrangler rewrites it
to the custom domain and OAuth discovery points at production.

## Deploy

Production runs as the Cloudflare Worker `alexandru-mcp`. Its custom domain is
`mcp.alexandru.so`, and its OAuth KV namespace ID is pinned in `wrangler.jsonc`.

Cloudflare Workers Builds deploys `main` when `apps/mcp/**`, `package.json`, or
`bun.lock` changes. It runs from `apps/mcp` with Bun 1.4.3, checks types with
`bun run typecheck` and `bun run test`, then deploys with `bun run deploy`.

For manual updates, authenticate Wrangler and set any missing secrets first:

```sh
bunx wrangler login
bunx wrangler secret put HEVY_API_KEY
bunx wrangler secret put GOOGLE_CLIENT_ID
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put NOTION_TOKEN     # internal integration token, not a personal token
bun run deploy
```

Link accounts once at `https://mcp.alexandru.so/connect/google`, `/connect/yc`, and
`/connect/robinhood`.
Google needs the callback URL
`https://mcp.alexandru.so/connect/google/callback` on its OAuth client; local
development uses `http://localhost:8787/connect/google/callback`.

Gateway sign-in uses the same OAuth client with separate callbacks:
`https://mcp.alexandru.so/login/google/callback` and
`http://localhost:8787/login/google/callback`. It requests only `openid email` and
does not store Google API tokens. Gmail/Calendar linking remains a separate flow.
The allowed login account is configured by `LOGIN_GOOGLE_EMAIL` in `wrangler.jsonc`.
Sign-in starts are limited to five per minute per IP.

In your MCP client, add `https://mcp.alexandru.so/mcp` as a custom connector and
sign in with Google, then approve the app. Hevy is available immediately after its API
key is configured. Google, YC, and Robinhood tools appear after their account sign-in completes.

## Robinhood

`/connect/robinhood` links the gateway to Robinhood's official hosted Trading MCP
at `https://agent.robinhood.com/mcp/trading`. Sign in to the gateway with Google,
then continue to Robinhood to authenticate and approve the connection. Robinhood
may require account onboarding, which you complete directly with Robinhood.

The callback is `https://mcp.alexandru.so/connect/robinhood/callback`. Client
registration, OAuth tokens, and the tool-list cache use the `upstream:robinhood:*`
keys in `OAUTH_KV`; there is no additional Worker secret or API key to configure.
Tools appear with the `robinhood_` prefix and preserve the upstream's annotations
and input schemas, including its account, market-data, and trading tools. Linking
the account does not place any orders. Reconnect at the same URL if authorization expires.

## Notion page access

1. Open [Notion connections](https://app.notion.com/developers/connections) and create
   an **API token** internal connection named `mcp.alexandru.so` in the intended workspace.
   Use its integration token, not a personal access token: a personal token inherits
   the user's wider page permissions.
2. Enable the content capabilities you need. The gateway supports reading, creating,
   and updating pages and blocks, plus reading/querying databases and data sources.
3. In **Content access → Edit access**, select only the pages/databases the gateway
   should use. Selecting a parent includes all its child pages. New integrations have
   no page access until content is shared.
4. Store the token as the Cloudflare secret `NOTION_TOKEN`, then deploy. For local
   development, add it to the ignored `.dev.vars` file.

`/connect/notion` links to these access settings; it no longer starts OAuth. Changes
to page access take effect on subsequent API calls without redeploying. Search is
title-based over shared pages/data sources; hosted Notion MCP's AI, connected-app
search, and agent tools are not exposed by this connector.

Run `bun run test` for the login, consent, and Notion permission-error checks.
