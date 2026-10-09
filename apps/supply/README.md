# Supply

Alexandru's public, read-only collection. Items live in this repository as markdown files.

## Stack

TanStack Start, Router and Query; React; Base UI; Tailwind CSS with system light/dark
mode; a Cloudflare Worker. No database: the catalog is read from `content/` at build
time and bundled into the Worker, and its images are shipped as static assets.

HTML is server-rendered on each request from the bundled catalog. Content changes reach
the site by deploying. Images are served at content-addressed `/images/<hash>.webp` URLs
and cached by browsers for a year (`public/_headers`).

## Content

Each item is a folder under `content/`, named by its URL slug:

```
content/apple-watch-series-10/
  index.md       front matter + notes
  image.webp     the item's image (required)
  notes-1.webp   images used in the notes (optional)
```

```md
---
name: "Apple Watch Series 10"
status: owned
tags: [technology]
link: "https://support.apple.com/en-ie/121202"
---

- Gets the job done.

## Specs

![Device details](notes-1.webp)
```

- `name` (required) is the display name; quote it if it contains a colon.
- `status` (required) is `owned`, `wishlist` or `retired`, one catalog view each.
- `tags` are category ids from `TAGS` in `src/lib/product.ts`. Adding a category
  means adding it there and giving it an icon in `src/components/controls.tsx`.
- `link` is an optional `http(s)` URL for the "Visit product" button.
- Notes are markdown. `##` headings sit under the page's "Notes" heading. Links open
  in a new tab; non-`http(s)` links and raw HTML are not rendered as such. Notes are
  public, as is this repository's history, so keep private details out of them.

The folder name is the item's URL, `/items/<folder>`: lowercase words joined by hyphens.
Renaming a folder changes the URL.

### Adding an item

1. Create `content/<slug>/index.md` with the front matter above.
2. Drop the image into the folder as `image.jpg`, `.png`, `.heic` or any common format.
3. Run `bun run images` from this directory. It converts every image in `content/` to
   WebP, at most 2000px on the long side, and deletes the original. It uses Bun's
   built-in `Bun.Image`: JPEG, PNG and WebP work anywhere, while HEIC, AVIF, TIFF and
   GIF rely on the OS codecs of macOS or Windows.
4. Run `bun run test` (or start the dev server) to validate, then commit and push.

The content is validated by `src/content/` whenever the site builds, the dev server
loads it, or the tests run. An unknown tag or status, a misspelled key, an invalid link,
a missing `image.webp` or a missing notes image fails with a message naming the folder,
so a broken item never deploys.

## Layout

- `content/`: the catalog, one folder per item.
- `src/content/`: the Vite plugin that validates `content/`, renders notes to HTML and
  exposes the items as `virtual:supply-content` (server only) and the images as files.
- `src/lib/`: code shared by server and browser (product types, statuses, tags, filters).
- `src/read/`: the server functions, query options and robots/sitemap responses.
- `src/routes/`: pages, plus the `robots.txt` and `sitemap.xml` server routes.
- `scripts/images.ts`: the image converter behind `bun run images`.

## Local Development

From the repository root:

```sh
bun install
cd apps/supply
bun run dev
```

The dev server reloads when anything under `content/` changes.

## Cloudflare Deployment

Resources in account `630f294bcb2c1e9b751d9fe0655a453a` (851):

- Worker name: `alexandru-supply`
- Public origin: `https://alexandru.supply` (also served at `https://supply.alexandru.so`)

Pushing to `main` deploys automatically: the Worker is connected to this repository
through Cloudflare Workers Builds, which runs
`bun run typecheck && bun run test && bun run build` and then `npx wrangler deploy` from
`apps/supply` when a push touches `apps/supply/*` or `bun.lock`. `bun run deploy`
deploys manually through an authorized Wrangler login.

The Workers Custom Domains are declared in `wrangler.jsonc`. Deploying configures their
DNS records and TLS certificates through Cloudflare. Both `workers_dev` and
`preview_urls` remain disabled; the custom domains are the public entry points.
Regenerate Worker types with `bun run cf-typegen` after changing `wrangler.jsonc`.

## Checks

The repository uses [Vite+](https://viteplus.dev) (`vp`) for its toolchain; the
root `vite.config.ts` holds the shared format (Oxfmt) and lint (Oxlint, type-aware)
settings. `bun run check` at the repository root runs `vp check` (formatting, lint
and type checks) followed by every workspace's tests and builds through
`vp run -r --cache`, which replays unchanged tests from cache. The
`.vite-hooks/pre-commit` hook runs the same non-mutating command before commits;
`bun install` installs it through `vp config`. Formatting is explicit
(`vp check --fix` or `vp fmt`); the hook never re-stages files. `/zold` is
excluded. Hooks are local and can be bypassed, so they are a workflow guard, not a
remotely enforced merge policy.

`bun run test` in this directory runs the unit tests: content parsing and validation,
notes rendering, URL filters, and a load of every item in `content/`. No UI test suite
is maintained.

References: [Cloudflare Start deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Workers static assets headers](https://developers.cloudflare.com/workers/static-assets/headers/).
