import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { RECENT_DAYS, ROLLING_DAYS, TARGETS } from "../config"
import { DailyBars, WeightChart } from "../components/charts"
import { DayTargets } from "../components/day"
import { MealList } from "../components/meals"
import { dashboardQuery } from "../read/queries"
import { dateLong, dateShort, grams, kcal, kg } from "../lib/format"
import { addDays } from "../lib/nutrition"

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.fetchQuery(dashboardQuery),
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ match }) => ({ links: [{ rel: "canonical", href: `${match.context.origin}/` }] }),
  component: Dashboard
})

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery)
  const { today, latest, recent, weights, weeks } = data
  if (!latest) {
    return (
      <main id="main" className="page-width py-24">
        <h1 className="display">Nothing logged yet.</h1>
        <p className="mt-3 text-muted">Add rows to content/meals.csv to get started.</p>
      </main>
    )
  }
  const heading =
    latest.date === today
      ? "Today"
      : latest.date === addDays(today, -1)
        ? "Yesterday"
        : "Latest day"
  const lastWeight = weights.at(-1)
  return (
    <main id="main" className="page-width space-y-12 pb-16">
      <section aria-labelledby="latest" className="pt-6 sm:pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="eyebrow">{dateLong(latest.date)}</p>
            <h1 id="latest" className="display mt-1">
              {heading}
            </h1>
          </div>
          <Link to="/days/$date" params={{ date: latest.date }} className="control">
            Day details
            <ArrowRight size={16} />
          </Link>
        </div>
        <DayTargets totals={latest.totals} />
        <div className="mt-3">
          <MealList meals={latest.meals} />
        </div>
      </section>

      <Section
        id="weight"
        title="Morning weight"
        aside={
          lastWeight && (
            <span>
              <span className="text-ink tabular-nums">{kg(lastWeight.kg)} kg</span> on{" "}
              {dateShort(lastWeight.date)} · {ROLLING_DAYS}-day avg{" "}
              <span className="text-ink tabular-nums">{kg(lastWeight.average)} kg</span>
            </span>
          )
        }
      >
        <div className="card">
          <WeightChart points={weights} />
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted/70" /> First weigh-in before noon
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-accent" /> {ROLLING_DAYS}-day rolling
              average
            </span>
          </p>
        </div>
      </Section>

      <Section id="recent" title={`Last ${RECENT_DAYS} days`}>
        <div className="grid gap-3 lg:grid-cols-3">
          <Chart title="Calories" unit="kcal">
            <DailyBars days={recent} metric="kcal" goal={TARGETS.kcal} unit="kcal" format={kcal} />
          </Chart>
          <Chart title="Protein" unit="g">
            <DailyBars
              days={recent}
              metric="protein"
              goal={TARGETS.protein}
              unit="g"
              format={grams}
            />
          </Chart>
          <Chart title="Fiber" unit="g">
            <DailyBars days={recent} metric="fiber" goal={TARGETS.fiber} unit="g" format={grams} />
          </Chart>
        </div>
      </Section>

      <Section id="weeks" title="Weekly averages">
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal sm:px-6">Week of</th>
                <th className="px-3 py-3 text-right font-normal">Days</th>
                <th className="px-3 py-3 text-right font-normal">Calories</th>
                <th className="px-3 py-3 text-right font-normal">Protein</th>
                <th className="px-3 py-3 text-right font-normal">Fiber</th>
                <th className="px-5 py-3 text-right font-normal sm:px-6">Morning weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {weeks.map((week) => (
                <tr key={week.week}>
                  <td className="px-5 py-3 sm:px-6">{dateShort(week.week)}</td>
                  <td className="px-3 py-3 text-right text-muted">{week.days}</td>
                  <Cell value={week.kcal} goal={TARGETS.kcal} format={kcal} unit="kcal" />
                  <Cell value={week.protein} goal={TARGETS.protein} format={grams} unit="g" />
                  <Cell value={week.fiber} goal={TARGETS.fiber.min} format={grams} unit="g" />
                  <td className="px-5 py-3 text-right sm:px-6">
                    {week.kg === null ? <span className="text-muted">–</span> : `${kg(week.kg)} kg`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  )
}

function Section({
  id,
  title,
  aside,
  children
}: {
  id: string
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {aside && <p className="text-sm text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  )
}

function Chart({ title, unit, children }: { title: string; unit: string; children: ReactNode }) {
  return (
    <div className="card">
      <p className="mb-4 eyebrow">
        {title} <span className="text-xs">({unit})</span>
      </p>
      {children}
    </div>
  )
}

function Cell({
  value,
  goal,
  format,
  unit
}: {
  value: number | null
  goal: number
  format: (value: number) => string
  unit: string
}) {
  if (value === null) return <td className="px-3 py-3 text-right text-muted">–</td>
  return (
    <td className={`px-3 py-3 text-right ${value >= goal ? "text-accent" : ""}`}>
      {format(value)} {unit}
    </td>
  )
}
