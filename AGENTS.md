# Agent handoff guide

Read `README.md` first. Treat `app/amex-analysis.json` as the immutable source snapshot and `app/lib/data.ts` as the canonical business-logic layer.

## Working rules

- Preserve the native-macOS design language. Every color flows through the CSS custom-property tokens at the top of `app/globals.css` (light `:root` plus a `prefers-color-scheme: dark` override that redefines tokens only) — never hardcode hex/rgba values in components or below the token layer. Any visual change must be checked in both light and dark mode.
- Typography is Inter Variable tuned to SF Pro rhythm: a 6-step scale (11/12/13/15/22/28px), variable weights capped at 650 (400/510/590/650), negative tracking at 13px and up, `tabular-nums` for figures, an 11px minimum font size, and sentence case everywhere — no uppercase or letter-spaced labels.
- Chrome details: vibrancy (translucent token + backdrop blur) on the sidebar, 50px sticky page headers, and the mobile bar; rounded-square gray selection for the active sidebar row; hairline separators inset within lists; pill search fields and status pills; radius scale 5/7/10/12px; no drop shadows except the segmented-control thumb and the chart tooltip.
- Prefer dense lists or tables over card grids. Keep page and section headers to one concise title; avoid eyebrow/subtitle pairs and explanatory labels beneath metric values.
- Use Hugeicons for interface icons. Category emoji are intentional.
- Keep category drill-downs and transaction recommendations grounded in the committed data. Do not infer categories from merchant names when Copilot categories are present.
- Do not invent benefit or offer status. Derive statement-visible credits from transactions; use the confirmed assumptions in `README.md`; ask the owner when evidence is insufficient.
- A negative merchant transaction can be a return rather than an offer credit. Add redeemed offers through explicit purchase/credit descriptor mappings in `app/lib/data.ts`.
- Do not commit generated output (`out/`, `.next/`, `.next-hunk/`, `dist/`) or local secrets.
- Do not add or restore `.openai/hosting.json`; this project deploys through Hunk and the canonical deployment metadata is `.hunk/config.json`.

## Before handing work back

Run:

```bash
npm run lint
npm run build:hunk
git diff --check
```

For approved live changes, commit the exact source files, push the branch, deploy with `hunk push out --json`, and verify the deployed route.
