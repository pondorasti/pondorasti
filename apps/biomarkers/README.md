# Biomarkers

Alexandru's lab results in the style of Apple Health: highlights, out-of-range flags, trends per metric, and the original lab reports.

## Stack

TanStack Start and Router, React, Base UI and Tailwind CSS, served by a Cloudflare Worker at [biomarkers.alexandru.so](https://biomarkers.alexandru.so). Pages are server-rendered from data bundled with the app; there is no backend.

- `src/data.ts` holds every result, transcribed from the reports in `public/pdfs`: sources, report index, categories, metric names and raw readings.
- `src/metrics.ts` builds metrics from the readings (newest first), classifies them against their reference ranges, and derives the summary, browse and report lists.
- Routes: `/` (Summary), `/browse`, `/reports` and `/m/$id` (one metric).

To add a lab panel, drop its PDF in `public/pdfs`, register it in `PDFS`, and add its readings to `REC`.

## Run locally

From the repository root:

```sh
bun install
bun run --cwd apps/biomarkers dev
```

`bun run --cwd apps/biomarkers preview` serves the production build in the local Workers runtime.

## Deploy

Pushing to `main` deploys automatically. The `alexandru-biomarkers` Worker is connected to this repository through Cloudflare Workers Builds, which runs `bun run typecheck && bun run build` and then `npx wrangler deploy` from `apps/biomarkers`, but only when a push touches `apps/biomarkers/*` or `bun.lock`. Build logs are in the Cloudflare dashboard under the Worker's Deployments; commits get a status check on GitHub.

To deploy by hand from your machine (with an authorized Wrangler login):

```sh
bun run --cwd apps/biomarkers deploy
```

The deploy script builds the app and runs `wrangler deploy`. The Worker (`alexandru-biomarkers`) and its custom domain are declared in `wrangler.jsonc`; deploying configures DNS and TLS.
