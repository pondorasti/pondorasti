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

- Model: MX0M3LW/A
- Case: 42mm Slate Titanium
- Band: Space Gray Milanese Loop (magnetic closure)
- Connectivity: GPS + Cellular
- Introduced: 2024

Gets the job done.

Never used any of the software/apps that it comes with other than the workout app.

Always use the same watch band, not worth the hassle to change them out.

Love the fast charging cable.

ALL notifications are turned off.

### Device details

![Apple Watch device details](notes-1.webp)
```

- `name` (required) is the display name; quote it if it contains a colon.
- `variant` is an optional color, size or edition, shown under the name on the item page.
  Keep it out of `name` so cards stay short.
- `status` (required) is `owned`, `wishlist` or `retired`, one catalog view each.
- `tags` are category ids from the `Tag` enum in `src/lib/product.ts`. Adding a category
  means adding it there and giving it an icon in `src/components/controls.tsx`.
- `link` is an optional `http(s)` URL for the "Visit product" button.
- Notes are markdown, in the format below. Links open in a new tab; non-`http(s)` links
  and raw HTML are not rendered as such. Notes are public, as is this repository's
  history, so keep private details out of them.

### Notes format

Notes have up to three parts, in this order, separated by blank lines:

1. **Specs**: a flat list of `- Label: value`, one fact per line. Labels are plain (no
   bold), in sentence case, and use the names below so the same fact reads the same on
   every item. Leave out what `name` or `variant` already says and any line with
   nothing useful to say.
2. **Remarks**: your own words about the item, as paragraphs.
3. **Images**: each `notes-N.webp` under a `### Caption` heading.

Labels, in order, by kind of item:

- Books: Author, Publisher, Published, Edition, Format, Pages, ISBN
- Apparel and shoes: Size, Color, Material, Fit, Purchased
- Skin, oral and bathroom products: Size, Type, Skin type or Hair type, SPF, Scent,
  Key ingredients, Purchased
- Everything else: Model, Color, then whatever specs matter for that item (Dimensions,
  Weight, Capacity, Material, Display, Connectivity, Battery, ...), then Purchased

Conventions:

- `Color`, not Colour or Finish; `Material`, not Fabric; `Model` is the model or part
  number when it identifies the item (`34WN80C-B`), or its full model name.
- `Purchased` is the first purchase date, `March 3, 2024`, or `March 2024` when the day
  isn't known. A later line can say `Quantity: 2` when more than one is owned.
- Wishlist items can have `Price` for the listed price.
- Retired items can say why with `Retired: Too small; donated`, or what took their
  place with `Replaced by: <item name>`, as the last spec.
- Not in notes: prices paid, receipts, order or receipt numbers, retailer SKUs, ASINs,
  UPCs and EANs, warranty and protection plans, where the image came from, and links
  that repeat `link`.

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

`bun run test` in this directory runs the unit tests, colocated with the code as
`*.test.ts`: content parsing and validation, notes rendering, URL filters, and a load
of every item in `content/`. No UI test suite is maintained.

References: [Cloudflare Start deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Workers static assets headers](https://developers.cloudflare.com/workers/static-assets/headers/).
