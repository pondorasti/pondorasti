# Supply

Alexandru's public, read-only collection. Items live in this repository as markdown files.

## Stack

TanStack Start, Router and Query; React; Base UI; Tailwind CSS with system light/dark
mode; a Cloudflare Worker. No database: the catalog is read from `content/` at build
time and bundled into the Worker, and its images are shipped as static assets.

HTML is server-rendered on each request from the bundled catalog. Content changes reach
the site by deploying. Images are served at content-addressed `/images/<hash>.webp` URLs
and cached by browsers for a year (`public/_headers`).

Each item and view also has a 1200×630 Open Graph card at `/og/<hash>.jpg`: the item's
image on a white stage with its category, name and the wordmark, or a view's headline over
a strip of its items. Like the images, cards are prepared locally and committed: `bun run
images` draws them into `og/` with `src/content/og-render.ts` (satori and sharp), and the
build only copies them. A card's hash covers what it shows and `og-render.ts` itself, so
renaming an item, replacing its image or editing the design gives it a new name; a test
and the build both fail until `bun run images` has drawn it.

## Content

Each item is a folder under `content/`, named by its URL slug:

```
content/apple-watch-series-10/
  index.md       front matter + notes
  image.webp     the item's image (required)
```

```md
---
name: "Apple Watch Series 10"
status: owned
tag: technology
link: "https://support.apple.com/en-ie/121202"
---

- Model: MX0M3LW/A
- Case: 42mm Slate Titanium
- Band: Space Gray Milanese Loop (magnetic closure)
- Weight: 34.4 g
- Display: Always-On Retina LTPO3 OLED, up to 2,000 nits
- Battery: Up to 18 hours (36 in Low Power Mode)
- Water resistance: 50 m
- Connectivity: GPS + Cellular
- Introduced: 2024

Gets the job done.

Never used any of the software/apps that it comes with other than the workout app.

Always use the same watch band, not worth the hassle to change them out.

Love the fast charging cable.

ALL notifications are turned off.
```

- `name` (required) is the display name; quote it if it contains a colon.
- `variant` is an optional color, size or edition, shown under the name on the item page.
  Keep it out of `name` so cards stay short.
- `status` (required) is `owned`, `wishlist` or `retired`, shown in the Collection, Wishlist
  and Archive views.
- `tag` (required) is the item's one category, an id from the `Tag` enum in
  `src/lib/product.ts`. Adding a category means adding it there and giving it an icon
  in `src/components/controls.tsx`.
- `group` is an optional sub group within the tag, e.g. `tag: bathroom` with
  `group: skin`. It must be one of the tag's groups in `TAG_GROUPS` in
  `src/lib/product.ts`. A selected category with groups shows one section per group,
  and "All" shows the group on the item's card.
- `link` is an optional `http(s)` URL for the "Visit product" button.
- Notes are markdown, in the format below. Links open in a new tab; non-`http(s)` links
  and raw HTML are not rendered as such. Notes are public, as is this repository's
  history, so keep private details out of them.

### Notes format

Notes have up to two parts, in this order, separated by a blank line:

1. **Specs**: a flat list of `- Label: value`, one fact per line. Labels are plain (no
   bold), in sentence case, and use the names below so the same fact reads the same on
   every item. Leave out what `name` or `variant` already says and any line with
   nothing useful to say.
2. **Remarks**: your own words about the item, as paragraphs.

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
  UPCs and EANs, warranty and protection plans, where the image came from, links that
  repeat `link`, and screenshots or photos of labels and settings screens (they can
  show serial numbers and other identifiers; write the facts down instead).

The folder name is the item's URL, `/items/<folder>`: lowercase words joined by hyphens.
Renaming a folder changes the URL.

### Adding an item

1. Create `content/<slug>/index.md` with the front matter above.
2. Drop the image into the folder as `image.jpg`, `.png`, `.heic` or any common format: a
   product shot of the item on its own, or for a book, the flat front cover.
3. Run `bun run images` from this directory. On macOS it lifts the item off its background
   with Vision (`scripts/cutout.swift`, the model behind "Copy Subject" in Photos) and crops
   it to the item plus a thin transparent border, so every image sits on the card the same
   way. Book covers are kept whole. It then converts the image to WebP, at most 2000px on the
   long side, and deletes the original. Images that are already clean are left alone, so
   it's safe to rerun. Last, it draws the Open Graph card of every item and view that
   lacks a current one into `og/` and deletes unused cards, so rerun it after renaming an
   item or changing its category too. Conversion uses Bun's built-in `Bun.Image`: JPEG, PNG and WebP work
   anywhere, while HEIC, AVIF, TIFF and GIF rely on the OS codecs of macOS or Windows.
4. Check the cutout, then run `bun run test` (or start the dev server) to validate, and
   commit and push.

The content is validated by `src/content/` whenever the site builds, the dev server
loads it, or the tests run. An unknown tag or status, a misspelled key, an invalid link,
a missing `image.webp` or a missing notes image fails with a message naming the folder,
so a broken item never deploys.

## Layout

- `content/`: the catalog, one folder per item.
- `og/`: the Open Graph cards, drawn by `bun run images`; never edit by hand.
- `src/content/`: the Vite plugin that validates `content/`, renders notes to HTML and
  exposes the items as `virtual:supply-content` (server only) and the images and Open
  Graph cards as files.
- `src/lib/`: code shared by server and browser (product types, statuses, tags, filters).
- `src/read/`: the server functions, query options and sitemap response.
- `src/routes/`: pages, plus the `sitemap.xml` server route.
- `scripts/images.ts` and `scripts/cutout.swift`: the background removal, converter and
  Open Graph card step behind `bun run images`.

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
- Public origin: `https://supply.alexandru.so` (`https://alexandru.supply` redirects to it)

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
