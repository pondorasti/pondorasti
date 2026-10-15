import { createFileRoute, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { TARGETS } from "../config"
import {
  ExploreBar,
  allEntries,
  fiberText,
  loadExploreDay,
  pct,
  validateExploreSearch
} from "../explore/shared"
import { dateLong, grams, kcal, label } from "../lib/format"
import { dayQuery } from "../read/queries"

export const Route = createFileRoute("/explore/d")({
  validateSearch: validateExploreSearch,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, deps }) => {
    const date = await loadExploreDay(context.queryClient, deps.date)
    if (!date) throw notFound()
    return date
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ meta: [{ title: "D · Ledger label | Macro" }] }),
  component: DirectionD
})

const GRID =
  "grid grid-cols-[1.15fr_1fr_1fr_1fr_1fr] gap-x-2 sm:grid-cols-[4.75rem_1fr_7.5rem_4.5rem_4.5rem_4.5rem_4.5rem] sm:gap-x-4"

const COLUMNS = [
  { key: "fat", name: "Fat", target: TARGETS.fat, floor: false },
  { key: "carbs", name: "Carbs", target: TARGETS.carbs, floor: false },
  { key: "fiber", name: "Fiber", target: TARGETS.fiber.min, floor: true },
  { key: "protein", name: "Protein", target: TARGETS.protein, floor: true }
] as const

function TargetMeter({ percent, floor }: { percent: number; floor: boolean }) {
  return (
    <div className="relative mt-1.5 ml-auto h-1.5 w-full max-w-[4.5rem] bg-track" aria-hidden>
      <div
        className={`absolute inset-y-0 left-0 ${floor && percent >= 100 ? "bg-accent" : "bg-ink"}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

function DirectionD() {
  const date = Route.useLoaderData()
  const { data: day } = useSuspenseQuery(dayQuery(date))
  if (!day) throw notFound()
  const { totals } = day
  const entries = allEntries(day.meals)
  const kcalPct = pct(totals.kcal, TARGETS.kcal)

  return (
    <main id="main" className="page-width pb-16">
      <ExploreBar current="d" date={day.date} prev={day.prev} next={day.next} />
      <h1 className="sr-only">{dateLong(day.date)}</h1>

      <article
        aria-label="Nutrition Facts"
        className="mt-6 rounded-2xl border-[1.5px] border-ink bg-surface px-3 pt-3 pb-4 tabular-nums sm:px-6 sm:pt-5"
      >
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h2 className="text-[40px] leading-[0.95] font-black tracking-[-0.035em] sm:text-[64px]">
            Nutrition Facts
          </h2>
          <div className="text-sm leading-snug sm:text-right sm:text-base">
            <p className="font-bold">{dateLong(day.date)}</p>
            <p className="text-muted">
              Serving size 1 day · {totals.entries} {totals.entries === 1 ? "item" : "items"}
            </p>
          </div>
        </header>

        <div className="mt-3 h-2.5 bg-ink" />

        <div
          role="row"
          className={`${GRID} border-b border-ink py-1.5 text-xs font-bold sm:text-sm`}
        >
          <span className="hidden sm:block">Time</span>
          <span className="hidden sm:block">Food</span>
          <span className="text-right">Calories</span>
          {COLUMNS.map((c) => (
            <span key={c.key} className="text-right">
              {c.name}
            </span>
          ))}
        </div>

        <div role="rowgroup">
          {entries.map((entry, i) => {
            const newRun = i > 0 && entries[i - 1].run !== entry.run
            return (
              <div
                key={i}
                role="row"
                className={`${GRID} py-2 text-sm ${
                  i === 0 ? "" : newRun ? "border-t-2 border-ink" : "border-t border-line"
                }`}
              >
                <span className="hidden leading-tight sm:block">
                  {entry.time}
                  {(i === 0 || newRun) && (
                    <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
                      {label(entry.meal)}
                    </span>
                  )}
                </span>
                <span className="col-span-5 mb-1 min-w-0 break-words sm:col-span-1 sm:mb-0">
                  <span className="mr-2 text-muted sm:hidden">
                    {entry.time}
                    {(i === 0 || newRun) && ` · ${label(entry.meal)}`}
                  </span>
                  {entry.item}
                </span>
                <span className="text-right">
                  <span className="font-bold">{kcal(entry.kcal)}</span>
                  <span className="mt-1 ml-auto block h-1 bg-track" aria-hidden>
                    <span
                      className="block h-full bg-ink/70"
                      style={{ width: `${(entry.kcal / totals.kcal) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="text-right">{grams(entry.fat)}g</span>
                <span className="text-right">{grams(entry.carbs)}g</span>
                <span className="text-right">
                  {fiberText(entry.fiber)}
                  {entry.fiber === null ? "" : "g"}
                </span>
                <span className="text-right">{grams(entry.protein)}g</span>
              </div>
            )
          })}
        </div>

        <div className="mt-1 h-2.5 bg-ink" />

        <div role="row" className={`${GRID} items-end py-2`}>
          <span className="col-span-5 text-[15px] font-black sm:col-span-2 sm:text-lg">
            Amount per day
          </span>
          <span className="text-right text-[26px] leading-none font-black tracking-[-0.03em] sm:text-[40px]">
            {kcal(totals.kcal)}
          </span>
          {COLUMNS.map((c) => (
            <span key={c.key} className="text-right text-[15px] font-black sm:text-lg">
              {grams(totals[c.key])}
              {c.key === "fiber" && totals.fiberUnknown > 0 ? "+" : ""}g
            </span>
          ))}
        </div>

        <div className="h-1.5 bg-ink" />

        <div role="row" className={`${GRID} py-2`}>
          <span className="col-span-5 text-sm font-bold sm:col-span-2">% Daily Target*</span>
          <span className="text-right">
            <span className="font-black">{kcalPct}%</span>
            <TargetMeter percent={kcalPct} floor />
          </span>
          {COLUMNS.map((c) => {
            const percent = pct(totals[c.key], c.target)
            return (
              <span key={c.key} className="text-right">
                <span className="font-black">{percent}%</span>
                <TargetMeter percent={percent} floor={c.floor} />
              </span>
            )
          })}
        </div>

        <div className="h-px bg-ink" />
        <p className="pt-2 text-[11px] leading-snug text-muted sm:text-xs">
          * Lean-bulk targets: {kcal(TARGETS.kcal)} kcal, {TARGETS.fat} g fat, {TARGETS.carbs} g
          carbs, {TARGETS.fiber.min}–{TARGETS.fiber.max} g fiber (% from {TARGETS.fiber.min} g),{" "}
          {TARGETS.protein} g protein. Bars under each food show its share of the day&rsquo;s
          calories; heavy rules mark a change of meal.
        </p>
      </article>
    </main>
  )
}
