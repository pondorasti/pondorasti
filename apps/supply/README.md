# Supply

Alexandru's public, read-only collection. Notion is the only editing surface.

## Stack

TanStack Start, Router and Query; React; Base UI; Tailwind CSS with system light/dark
mode; a Cloudflare Worker; Drizzle on D1; private R2 image storage; Vitest running
against actual local D1 and R2 bindings.

There is no prerendered catalog and no build-time dependency on Notion. HTML is
server-rendered from D1. Visitor requests never call Notion. Query hydrates the
request-scoped server cache and refreshes active data every five minutes. Public
HTML/data responses are not CDN-cached; immutable, content-addressed images are
browser-cacheable for a year.

## Local Development

From the repository root:

```sh
bun install
bunx lefthook install
cd apps/supply
bun run db:migrate:local
bun run dev
```

For real data, create an ignored `.dev.vars` from `.dev.vars.example` containing
`NOTION_TOKEN` and a random `SYNC_SECRET` with at least 32 bytes of entropy. Restart
the dev server after changing credentials. Never put either secret in a tracked
file, URL, command argument, screenshot, or log.

With the dev server running, in another terminal:

```sh
cd apps/supply
bun run sync
bun run sync --status
bun run sync --force
```

The sync command defaults to `http://localhost:5173`. Set `SUPPLY_ORIGIN` for a
different local port or the production HTTPS origin. Keep the command connected
until it completes. A manual sync is awaited, not put into HTTP `waitUntil`, which
does not give long-running work enough time. `--force` refreshes all bodies and
images even if Notion's revision timestamp is unchanged.

## Notion Connection

Create a dedicated internal connection in the 851 workspace, named Supply, with
only **Read content** capability. Disable insert/update content, comment access,
and user information. Grant it access to the Supply database, not the enclosing
personal workspace. Store its token in `.dev.vars` locally and a Worker secret in
production. An interactive Notion MCP connection is not a deployable API token.

The dedicated [Supply connection](https://app.notion.com/developers/connections/3dbb49ce-7f0b-8168-98cb-0027343688be?spaceId=e0a0747e-78da-40a6-8ac4-283c071d1720)
has read-only access to this database. Wrangler declares the required secret names
explicitly, so generated types do not depend on whether a checkout has local secrets.

- Database: `3b6b49ce-7f0b-80fb-8c8b-d57dda7079b3`
- Data source: `3b6b49ce-7f0b-80cd-ad07-000b96417ff1`
- Required schema: `Name` (title), `Link` (URL), `Ownership status` (select),
  `Tags` (multi-select), `Thumbnail` (files).

All rows, including Retired, are mirrored. The public catalog, detail lookup and
sitemap exclude Retired and deleted rows. Deleted rows retain tombstones so a
restored Notion page gets its original URL. URLs remain stable across title edits.

Notes render common Notion text blocks, nested lists, headings, links, toggles,
checkbox states, captions, and images. Unsupported blocks are not embedded;
supported child content remains readable. HTML and executable links are never
rendered from Notion. Review personal page bodies before the first public launch.

## Sync Guarantees

Every five minutes, the Worker validates the schema and scans every page of
metadata. Unchanged page revisions skip body/image requests. Changed items have
their paginated nested bodies fetched and all images persisted before publication.

Notion requests are spaced at least 550 ms apart. Transient HTTP errors have
bounded retries, honor `Retry-After`, and stop instead of retrying sooner than
Notion allows. A three-minute renewable lease prevents overlapping jobs; a
monotonic fencing value rejects stale publishers inside the final D1 transaction.

The D1 batch publishes the complete update atomically. A partial scan, failed
body/image download, failed R2 write, or failed D1 statement leaves the last good
catalog intact. Deletions happen only after the complete scan succeeds. A sync is
not a transactional snapshot of Notion itself: an edit made during the scan can
appear on the following run.

R2 keys are SHA-256 hashes of downloaded image bytes. Rotated signed URLs do not
cause new uploads; identical images share objects. Failed runs can leave harmless
orphan objects, reused on retry. Old objects are deliberately retained for cached
pages. Do not add an R2 expiry policy or delete objects manually. A future garbage
collector must account for live references, in-flight runs and cached URLs.

Notion-hosted PNG/JPEG/GIF/WebP/AVIF files are supported. Images are limited to
8 MiB, streamed with a bounded buffer and validated by their file signatures.
External images fail closed unless their exact trusted host is configured through
`IMAGE_ALLOWED_HOSTS` (comma-separated). Redirect destinations are checked too.
The current catalog also uses `isntree-global.com` and `cdsassets.apple.com`, which
are explicitly allowed in the Worker configuration.
SVG and HTML images are rejected. Notion does not provide content checksums, so
changed pages still require an image download to hash the bytes. External images
changed independently of Notion need a forced refresh.

Guardrails: 750 active rows, 5,000 blocks per product, 30 nested levels, 24 MiB of
changed snapshot data, and a twelve-minute run budget. Hitting a limit preserves
the previous catalog and records a failure. This single-worker approach should be
revisited before substantially growing the collection beyond the tested 175 rows.

## Cloudflare Deployment

Resources in account `630f294bcb2c1e9b751d9fe0655a453a` (851):

- Worker name: `supply`
- D1: `alexandru-supply`, ID `1edcb7f5-a2e8-4524-b5f2-bdbb55fb0671`
- R2: `alexandru-supply-images`, private; images are served through the Worker
- Intended public origin: `https://alexandru.supply`

**Deployment prerequisites:** confirm the account's Workers paid plan, configure
the Notion connection, review public content, apply the remote migration, and set
both secrets. A full initial sync exceeds the Free plan's 50 subrequest/query
limits. Resource creation does not itself confirm the Workers billing plan. Do
not silently enable a paid plan.

Use existing Cloudflare MCP access where supported. Wrangler is needed to package
the built Worker and static assets; use an authorized local login or appropriately
scoped token. Do not commit credentials.

```sh
cd apps/supply
bun run db:migrate:remote
bunx wrangler secret put NOTION_TOKEN
bunx wrangler secret put SYNC_SECRET
bun run deploy
```

The custom domain is intentionally not attached in `wrangler.jsonc` yet. Once the
content and initial sync are verified, add a Workers Custom Domain for
`alexandru.supply` (`{ "pattern": "alexandru.supply", "custom_domain": true }`
in `routes`) and deploy. `workers_dev` is disabled, so a deployment without a
domain is not a public preview. Use local validation before that launch, or a
separately authorized private preview. Cron does not require a public domain.

```sh
SUPPLY_ORIGIN=https://alexandru.supply bun run sync --status
SUPPLY_ORIGIN=https://alexandru.supply bun run sync
```

The status command returns the last successful sync time and recent runs. A
skipped run means another worker owns the lease. Investigate repeated failures or
a `lastSuccess` older than 15 minutes. Error records contain stable codes, not
tokens or signed URLs. Completed run history is retained for fourteen days after
a successful sync. Interrupted runs can remain marked `running`; the lease still
expires so later jobs recover. `/api/health` checks D1 connectivity, not freshness.

For schema changes: edit `src/server/schema.ts`, run `bun run db:generate`, commit
the generated migration and Drizzle metadata, then apply local and remote
migrations. Regenerate Worker types with `bun run cf-typegen` after binding changes.

## Checks

`bun run check` at the repository root runs Oxfmt, Oxlint, workspace typechecks,
tests and builds. Lefthook runs the same non-mutating command before commits.
Formatting is explicit (`bun run format`); the hook never re-stages files. `/zold`
is excluded. CLI release jobs still build and publish, with no redundant GH tests.
Hooks are local and can be bypassed, so they are a workflow guard, not a remotely
enforced merge policy. Run `bunx lefthook install` in any fresh checkout.

`bun run test` in this directory runs focused unit/integration tests. External
Notion/image HTTP is simulated; SQL transactions and R2 persistence use actual
Cloudflare local bindings. Coverage includes full-size pagination, throttling,
retry budgets, nested content, asset deduplication, failed uploads, rollback,
lease races, deletions/restoration, retirement, stable slugs, public read isolation,
and sync authentication. No UI test suite is maintained.

References: [Cloudflare Start deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Worker limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[Notion connections](https://developers.notion.com/guides/get-started/internal-connections).
