import { createFileRoute, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { TARGETS } from "../config"
import {
  ExploreBar,
  NUTRIENTS,
  allEntries,
  fiberText,
  kcalShare,
  loadExploreDay,
  pct,
  validateExploreSearch
} from "../explore/shared"
import { dateLong, grams, kcal, label } from "../lib/format"
import type { Entry } from "../lib/nutrition"
import { dayQuery } from "../read/queries"

export const Route = createFileRoute("/explore/b")({
  validateSearch: validateExploreSearch,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, deps }) => {
    const date = await loadExploreDay(context.queryClient, deps.date)
    if (!date) throw notFound()
    return date
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ meta: [{ title: "B · Label + log | Macro" }] }),
  component: DirectionB
})

const PARTS = [
  { name: "Morning", until: "12:00" },
  { name: "Afternoon", until: "17:00" },
  { name: "Evening", until: "21:00" },
  { name: "Night", until: "24:00" }
] as const

function partsOfDay(entries: Entry[]) {
  return PARTS.map((part, i) => ({
    name: part.name,
    entries: entries.filter((e) => e.time < part.until && (i === 0 || e.time >= PARTS[i - 1].until))
  })).filter((part) => part.entries.length > 0)
}

function Meter({ value, target, floor }: { value: number; target: number; floor: boolean }) {
  const scale = Math.max(target * 1.25, value)
  return (
    <div className="relative mt-1.5 h-1 rounded-full bg-track" aria-hidden>
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${floor && value >= target ? "bg-accent" : "bg-ink"}`}
        style={{ width: `${(value / scale) * 100}%` }}
      />
      <div
        className="absolute -inset-y-1 w-0.5 bg-ink"
        style={{ left: `${(target / scale) * 100}%` }}
      />
    </div>
  )
}

function DirectionB() {
  const date = Route.useLoaderData()
  const { data: day } = useSuspenseQuery(dayQuery(date))
  if (!day) throw notFound()
  const { totals } = day
  const share = kcalShare(totals)
  const parts = partsOfDay(allEntries(day.meals))
  const cols = "sm:grid-cols-[4.5rem_1fr_3.5rem_2.75rem_2.75rem_2.75rem_2.75rem]"

  return (
    <main id="main" className="page-width pb-16">
      <ExploreBar current="b" date={day.date} prev={day.prev} next={day.next} />
      <h1 className="display mt-6 mb-8">{dateLong(day.date)}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr] lg:gap-10">
        <section
          aria-label="Nutrition Facts"
          className="rounded-2xl bg-surface p-5 tabular-nums sm:p-6 lg:sticky lg:top-6"
        >
          <h2 className="text-[34px] leading-none font-black tracking-[-0.03em]">
            Nutrition Facts
          </h2>
          <div className="mt-2 flex justify-between border-b border-ink/80 pb-1.5 text-sm">
            <span className="font-semibold">Serving size</span>
            <span>
              1 day · {totals.entries} {totals.entries === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="mt-1 h-2 bg-ink" />
          <p className="mt-2 text-xs font-bold">Amount per day</p>
          <div className="flex items-end justify-between leading-none">
            <span className="text-[30px] font-black tracking-[-0.02em]">Calories</span>
            <span className="text-[44px] font-black tracking-[-0.03em]">{kcal(totals.kcal)}</span>
          </div>
          <Meter value={totals.kcal} target={TARGETS.kcal} floor />
          <p className="mt-2 text-right text-xs text-muted">
            {pct(totals.kcal, TARGETS.kcal)}% of {kcal(TARGETS.kcal)}
          </p>
          <div className="mt-2 h-1 bg-ink" />
          <p className="border-b border-ink/30 py-1.5 text-right text-xs font-bold">
            % Daily Target
          </p>
          {NUTRIENTS.map((n) => (
            <div key={n.key} className={`border-b border-ink/30 py-2 ${n.indent ? "pl-4" : ""}`}>
              <div className="flex items-baseline justify-between text-[15px]">
                <span>
                  <span className={n.indent ? "" : "font-bold"}>{n.label}</span>{" "}
                  <span className="text-muted">
                    {grams(totals[n.key])}
                    {n.key === "fiber" && totals.fiberUnknown > 0 ? "+" : ""} g
                  </span>
                </span>
                <span className="font-bold">{pct(totals[n.key], n.target)}%</span>
              </div>
              <Meter value={totals[n.key]} target={n.target} floor={n.floor} />
            </div>
          ))}
          <div className="h-2 bg-ink" />
          <div className="mt-3 flex h-2 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-ink" style={{ width: `${share.protein}%` }} />
            <div className="bg-ink/50" style={{ width: `${share.carbs}%` }} />
            <div className="bg-ink/20" style={{ width: `${share.fat}%` }} />
          </div>
          <p className="mt-2 flex justify-between text-xs text-muted">
            <span>Protein {share.protein}%</span>
            <span>Carbs {share.carbs}%</span>
            <span>Fat {share.fat}%</span>
          </p>
          <p className="mt-3 text-[11px] leading-snug text-muted">
            Daily targets for a lean bulk: {kcal(TARGETS.kcal)} kcal, {TARGETS.protein} g protein,{" "}
            {TARGETS.carbs} g carbs, {TARGETS.fat} g fat, {TARGETS.fiber.min}–{TARGETS.fiber.max} g
            fiber.
          </p>
        </section>

        <section aria-label="Food log">
          <div
            className={`hidden border-b border-line pb-2 text-xs text-muted sm:grid ${cols} gap-x-3`}
          >
            <span>Time</span>
            <span>Food</span>
            <span className="text-right">kcal</span>
            <span className="text-right">P</span>
            <span className="text-right">C</span>
            <span className="text-right">F</span>
            <span className="text-right">Fib</span>
          </div>
          {parts.map((part) => (
            <div key={part.name}>
              <h3 className="mt-6 mb-1 text-xs font-semibold tracking-[0.08em] text-muted uppercase first:mt-4">
                {part.name}
              </h3>
              <ul className="divide-y divide-line">
                {part.entries.map((entry, i) => (
                  <li
                    key={i}
                    className={`grid grid-cols-[3.25rem_1fr_auto] gap-x-3 py-2.5 text-sm tabular-nums ${cols}`}
                  >
                    <span className="row-span-2 sm:row-span-1">
                      <span className="block">{entry.time}</span>
                      <span className="block text-[11px] leading-tight text-muted">
                        {label(entry.meal)}
                      </span>
                    </span>
                    <span className="min-w-0 break-words">{entry.item}</span>
                    <span className="text-right font-medium">{kcal(entry.kcal)}</span>
                    <span className="col-span-2 text-xs text-muted sm:hidden">
                      {grams(entry.protein)} P · {grams(entry.carbs)} C · {grams(entry.fat)} F ·{" "}
                      {fiberText(entry.fiber)} fib
                    </span>
                    <span className="hidden text-right text-muted sm:block">
                      {grams(entry.protein)}
                    </span>
                    <span className="hidden text-right text-muted sm:block">
                      {grams(entry.carbs)}
                    </span>
                    <span className="hidden text-right text-muted sm:block">
                      {grams(entry.fat)}
                    </span>
                    <span className="hidden text-right text-muted sm:block">
                      {fiberText(entry.fiber)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
