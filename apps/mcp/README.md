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
- `src/mcp.ts`: stateless MCP server (`createMcpHandler` from MCP SDK v2). Each
  connector registers prefixed tools.
- `src/connectors/hevy.ts`: read-only Hevy tools, using `HEVY_API_KEY`.
- `src/health/`: Apple Health data pushed by the
  [Health Auto Export](https://www.healthyapps.dev/) iOS app to `POST /health/ingest`
  (`Authorization: Bearer <HEALTH_INGEST_TOKEN>`), stored in the `DB` D1 database
  (`migrations/`). Rows upsert on their key, so repeated or overlapping pushes are
  harmless. `src/connectors/health.ts` exposes it as `health_*` tools.
- `src/connectors/upstream.ts`: remote MCP servers the gateway proxies as `<id>_<tool>`
  (YC and Notion). The gateway is their OAuth client: sign in once at `/connect/<id>`
  (behind the same password) and the registration and tokens stay in `OAUTH_KV`. Tool
  lists are cached there for an hour; calls always go live.

To add an API-key service, write `src/connectors/<name>.ts` exporting a
`register<Name>(server, env)` and add it to `connectors` in `src/mcp.ts`. To add a remote
MCP server, add its URL to `UPSTREAMS` in `src/connectors/upstream.ts`.

## Local development

```sh
cp .dev.vars.example .dev.vars                 # fill in the secrets
bunx wrangler d1 migrations apply DB --local   # create the health tables
bun run dev                                    # http://localhost:8787/mcp
bun run test                                   # parser + D1 tests (in-memory D1)
```

`--local-upstream` keeps the request host as localhost; without it wrangler rewrites it
to the custom domain and OAuth discovery points at production.

## Deploy

```sh
bunx wrangler secret put LOGIN_PASSWORD   # long and random
bunx wrangler secret put HEVY_API_KEY
bunx wrangler secret put HEALTH_INGEST_TOKEN   # e.g. from `openssl rand -hex 32`
bun run deploy   # first deploy also creates OAUTH_KV and DB; then applies migrations/
```

`bun run deploy` is `wrangler deploy && wrangler d1 migrations apply DB --remote`, so new
migrations go out with the code (already-applied ones are skipped).

Then open `https://mcp.alexandru.so/connect/yc` and `/connect/notion` to link each upstream, and in Claude: Settings → Connectors → Add custom connector → `https://mcp.alexandru.so/mcp`.

## Apple Health (Health Auto Export)

Health Auto Export reads Apple Health on the iPhone (including everything the Apple Watch
records) and POSTs it here. Automations may need the app's premium tier.

In the app: Automations → New Automation → REST API. Create two automations with these
settings (anything not listed can stay at its default):

| Setting                 | Metrics automation                               | Workouts automation       |
| ----------------------- | ------------------------------------------------ | ------------------------- |
| URL                     | `https://mcp.alexandru.so/health/ingest`         | same                      |
| Headers                 | `Authorization` = `Bearer <HEALTH_INGEST_TOKEN>` | same                      |
| Data Type               | Health Metrics                                   | Workouts                  |
| Export Format           | JSON                                             | JSON                      |
| Export Version          | Version 2                                        | Version 2                 |
| Date Range              | Default                                          | Default                   |
| Summarize Data          | On                                               | n/a                       |
| Time Grouping           | Day                                              | Minutes (workout metrics) |
| Include Route Data      | n/a                                              | Off                       |
| Include Workout Metrics | n/a                                              | On                        |
| Batch Requests          | On                                               | On                        |
| Sync Cadence            | every 1 hour                                     | every 1 hour              |

Health metrics to select: Active Energy, Resting Energy (Basal Energy Burned), Step Count,
Heart Rate, Resting Heart Rate, Heart Rate Variability, Sleep Analysis, Weight & Body Mass,
Apple Exercise Time, Walking + Running Distance, Flights Climbed, VO2 Max. Others are
stored too and readable with `health_get_metric`, but each one slows the export down.

Why these settings:

- Date Range Default re-sends all of yesterday and today on every run. A day's total is
  stored under that day, so each run replaces it with the latest full figure. Avoid
  "Since Last Sync": it would send partial-day totals that overwrite the day's earlier total.
- Keep Time Grouping on Day. Switching later leaves both granularities stored and daily
  sums double-count; if you switch, clear the metric first, e.g.
  `bunx wrangler d1 execute DB --remote --command "DELETE FROM health_samples WHERE metric = 'step_count'"`.
- iOS only lets the app read Health data while the phone is unlocked, so runs happen when
  you use the phone; adding the app's Automations widget to the Home Screen helps.

Backfill history from each automation's Manual Export (e.g. the last 90 days), then check
the result with the `health_sync_status` tool. To test the endpoint by hand:

```sh
curl -X POST https://mcp.alexandru.so/health/ingest \
  -H "Authorization: Bearer $HEALTH_INGEST_TOKEN" -H "Content-Type: application/json" \
  -d '{"data":{"metrics":[{"name":"step_count","units":"count","data":[{"date":"2026-10-13 00:00:00 +0300","qty":1234}]}]}}'
# {"received":{"samples":1,"workouts":0},"written":{"samples":1,"workouts":0},"skipped":0}
```

MCP tools (days are the phone's local dates; sleep counts toward the day you woke up):

- `health_daily_summary`: per-day active/basal/total kcal, steps, exercise minutes,
  distance, resting HR, HRV, VO2 max, weight, heart rate min/avg/max, sleep stages, and
  that day's workouts (up to 92 days).
- `health_list_workouts`: workouts with duration, kcal, avg/max HR, distance and details.
- `health_get_metric`: raw stored samples of any metric.
- `health_sync_status`: what is stored and when each metric last changed.

Energy is stored in kcal, mass in kg and distance in km whatever units the phone uses.
