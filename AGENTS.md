# Agent handoff guide

Read `README.md` first. Treat `app/amex-analysis.json` as the immutable source snapshot and `app/lib/data.ts` as the canonical business-logic layer.

## Working rules

- Preserve the compact macOS-inspired interface: Inter, blue accent, 54px sticky/blurred page header, compact sidebar rows, rounded controls, hairline borders, and no card shadows.
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
