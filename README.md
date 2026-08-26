# AMEX Card Playbook

A personal dashboard for reviewing 2026 year-to-date spending across an American Express Gold and Platinum card. It combines transaction history, Copilot Money categories, card-routing analysis, benefit usage, and AMEX Offer redemptions.

Live site: [amex-card-playbook.hunk.851.sh](https://amex-card-playbook.hunk.851.sh)

## What is in the repository

- `app/amex-analysis.json` — committed analysis snapshot with 556 transactions from January 1 through August 19, 2026.
- `app/lib/data.ts` — the canonical derived-data layer for categories, rewards, benefits, offers, and dashboard totals.
- `app/page.tsx` — overview.
- `app/transactions/` — searchable transaction table and routing recommendations.
- `app/categories/` — monthly category chart, category table, and category drill-down pages.
- `app/benefits/` — benefit usage, remaining value, skipped items, and enrollment/access lists.
- `app/offers/` — active offers and redeemed-offer history.
- `.hunk/config.json` — non-secret Hunk app identifier used for deployment.

## Stack

- Next.js 16 and React 19
- TypeScript
- Vinext/Vite for local development
- Recharts for the category trend chart
- Hugeicons and Inter
- Hunk static hosting

## Local development

```bash
npm install
npm run dev
```

The application is fully local and does not require environment variables or a backend.

## Validation and deployment

```bash
npm run lint
npm run build:hunk
hunk push out --json
```

`build:hunk` creates the static export in `out/` and copies the tracked `.hunk/config.json` into the export. Generated directories are ignored and should not be committed.

## Important product assumptions

- Copilot Money categories are authoritative for display; `reward_category` is used for AMEX multiplier analysis.
- Gold is preferred for restaurants and U.S. groceries; Platinum is preferred for flights and card benefits.
- Annual fees are modeled as $895 for Platinum and $325 for Gold ($1,220 total).
- Overview “Value captured YTD” combines benefits used, redeemed-offer cash back, and earned Membership Rewards points valued at 1.5¢ each.
- CLEAR+ is treated as fully used for the current benefit year.
- Gold and Platinum Uber Cash are assumed to be fully used each month.
- Dunkin’ is intentionally skipped but its remaining dollar value is still included in “Left to use.”
- Global Entry/TSA PreCheck is not personally applicable, but its available value remains visible as skipped value.
- Walmart+, Saks, Equinox, and Oura are confirmed unused in the current snapshot.
- When benefit status cannot be established from statement credits or these confirmed assumptions, ask the owner instead of guessing.
- Redeemed offers may use a different credit descriptor from the purchase merchant. Peak Design purchases use `PEAKDESIGN`, while the two $54 total credits use `PD SAMPLE`.

## Data and privacy

The committed JSON contains real merchant-level transaction history. Do not add account credentials, full card numbers, authentication cookies, or exported browser-session data.
