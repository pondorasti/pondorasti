import { createFileRoute, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { TARGETS } from "../config"
import {
  ExploreBar,
  NUTRIENTS,
  allEntries,
  kcalShare,
  loadExploreDay,
  pct,
  validateExploreSearch
} from "../explore/shared"
import { dateLong, grams, kcal, label } from "../lib/format"
import { MEALS } from "../lib/nutrition"
import { dayQuery } from "../read/queries"

export const Route = createFileRoute("/explore/a")({
  validateSearch: validateExploreSearch,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, deps }) => {
    const date = await loadExploreDay(context.queryClient, deps.date)
    if (!date) throw notFound()
    return date
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ meta: [{ title: "A · FDA label | Macro" }] }),
  component: DirectionA
})

const clock = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

function DirectionA() {
  const date = Route.useLoaderData()
  const { data: day } = useSuspenseQuery(dayQuery(date))
  if (!day) throw notFound()
  const { totals } = day
  const entries = allEntries(day.meals)
  const byKcal = [...entries].sort((a, b) => b.kcal - a.kcal)
  const share = kcalShare(totals)
  const counts = MEALS.map((meal) => [meal, entries.filter((e) => e.meal === meal).length] as const)
    .filter(([, count]) => count > 0)
    .map(([meal, count]) => `${label(meal)} ${count}`)

  return (
    <main id="main" className="page-width pb-16">
      <ExploreBar current="a" date={day.date} prev={day.prev} next={day.next} />
      <h1 className="display mt-6 mb-8">{dateLong(day.date)}</h1>

      <article className="grid gap-8 rounded-sm bg-white p-4 text-black shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.35)] sm:p-8 md:grid-cols-[400px_1fr] md:gap-10">
        <section
          aria-label="Nutrition Facts"
          className="self-start border border-black px-2 pt-1 pb-2 leading-tight tracking-normal [font-feature-settings:'tnum']"
        >
          <h2 className="text-[42px] leading-[1.05] font-black tracking-[-0.025em] sm:text-[46px]">
            Nutrition Facts
          </h2>
          <div className="border-b border-black pb-1 text-[17px]">
            {totals.entries} {totals.entries === 1 ? "item" : "items"} logged this day
          </div>
          <div className="flex items-baseline justify-between pt-0.5 text-[19px] font-black">
            <span>Serving size</span>
            <span>1 day</span>
          </div>

          <div className="mt-1 h-[11px] bg-black" />

          <p className="pt-1 text-sm font-black">Amount per day</p>
          <div className="flex items-end justify-between leading-none">
            <span className="text-[36px] font-black tracking-[-0.02em]">Calories</span>
            <span className="text-[48px] font-black tracking-[-0.03em]">{kcal(totals.kcal)}</span>
          </div>

          <div className="mt-1 h-[6px] bg-black" />

          <p className="border-b border-black py-1 text-right text-sm font-black">
            % Daily Target*
          </p>
          {NUTRIENTS.map((n) => (
            <div
              key={n.key}
              className={`flex items-baseline justify-between border-b border-black py-1 text-[15px] ${
                n.indent ? "pl-5" : ""
              }`}
            >
              <span>
                <span className={n.indent ? "" : "font-black"}>{n.label}</span>{" "}
                {grams(totals[n.key])}g{n.key === "fiber" && totals.fiberUnknown > 0 && "†"}
              </span>
              <span className="font-black">{pct(totals[n.key], n.target)}%</span>
            </div>
          ))}

          <div className="h-[11px] bg-black" />

          {(
            [
              ["Calories from protein", totals.protein * 4, share.protein],
              ["Calories from carbohydrate", totals.carbs * 4, share.carbs],
              ["Calories from fat", totals.fat * 9, share.fat]
            ] as const
          ).map(([name, cal, percent], i) => (
            <div
              key={name}
              className={`flex items-baseline justify-between py-1 text-[15px] ${
                i < 2 ? "border-b border-black" : ""
              }`}
            >
              <span>
                {name} {kcal(cal)}
              </span>
              <span>{percent}%</span>
            </div>
          ))}

          <div className="h-[6px] bg-black" />

          <p className="flex gap-1 pt-1.5 text-[11px] leading-snug">
            <span>*</span>
            <span>
              The % Daily Target tells you how much of a lean-bulk target this day&rsquo;s food
              provides. {kcal(TARGETS.kcal)} calories a day; {TARGETS.protein}g protein,{" "}
              {TARGETS.carbs}g carbohydrate, {TARGETS.fat}g fat and {TARGETS.fiber.min}–
              {TARGETS.fiber.max}g fiber, measured from {TARGETS.fiber.min}g.
            </span>
          </p>
          {totals.fiberUnknown > 0 && (
            <p className="flex gap-1 pt-1 text-[11px] leading-snug">
              <span>†</span>
              <span>
                {totals.fiberUnknown} {totals.fiberUnknown === 1 ? "item has" : "items have"} no
                fiber logged, so the true amount is higher.
              </span>
            </p>
          )}
        </section>

        <section aria-label="Ingredients" className="space-y-5 text-[15px] leading-relaxed">
          <p>
            <span className="font-black tracking-wide uppercase">Ingredients: </span>
            {byKcal.map((entry, i) => (
              <span key={i}>
                {entry.item}{" "}
                <span className="whitespace-nowrap text-black/55 tabular-nums">
                  ({kcal(entry.kcal)} cal, {grams(entry.protein)}g protein)
                </span>
                {i < byKcal.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
          <p className="text-[13px] text-black/65">Listed in descending order of calories.</p>
          <div className="border-t border-black pt-4 text-[13px] leading-relaxed">
            <p>
              <span className="font-black uppercase">Eaten: </span>
              {clock(entries[0].time)} to {clock(entries.at(-1)!.time)}, Los Angeles time.
            </p>
            <p>
              <span className="font-black uppercase">Meals: </span>
              {counts.join(" · ")}.
            </p>
          </div>
        </section>
      </article>
    </main>
  )
}
