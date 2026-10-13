import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { DayTargets } from "../components/day"
import { MealList } from "../components/meals"
import { dayQuery } from "../read/queries"
import { dateLong, dateShort, grams, kcal } from "../lib/format"
import { IsoDate } from "../lib/nutrition"

export const Route = createFileRoute("/days/$date")({
  loader: async ({ context, params }) => {
    if (!IsoDate.safeParse(params.date).success) throw notFound()
    const day = await context.queryClient.fetchQuery(dayQuery(params.date))
    if (!day) throw notFound()
    return day
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ loaderData: day, match: { context } }) =>
    day
      ? {
          meta: [{ title: `${dateLong(day.date)} | Macro` }],
          links: [{ rel: "canonical", href: `${context.origin}/days/${day.date}` }]
        }
      : {},
  component: Day
})

function Day() {
  const { date } = Route.useParams()
  const { data: day } = useSuspenseQuery(dayQuery(date))
  if (!day) throw notFound()
  const { totals } = day
  return (
    <main id="main" className="page-width pb-16">
      <div className="mt-2 flex items-center justify-between gap-3">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className="inline-flex size-9 items-center justify-center rounded-full bg-surface transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={16} />
        </Link>
        <nav aria-label="Other days" className="flex items-center gap-2">
          <DayLink date={day.prev} direction="prev" />
          <DayLink date={day.next} direction="next" />
        </nav>
      </div>
      <div className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="display">{dateLong(day.date)}</h1>
        <p className="text-sm text-muted tabular-nums">
          <span className="text-ink">{kcal(totals.kcal)} kcal</span> · {grams(totals.protein)} g
          protein · {grams(totals.carbs)} g carbs · {grams(totals.fat)} g fat ·{" "}
          {grams(totals.fiber)} g fiber
        </p>
      </div>
      <DayTargets totals={totals} />
      <h2 className="mt-12 mb-4 section-title">Meals</h2>
      <MealList meals={day.meals} />
    </main>
  )
}

function DayLink({ date, direction }: { date: string | null; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight
  const text = direction === "prev" ? "Previous day" : "Next day"
  if (!date) {
    return (
      <span
        aria-disabled="true"
        aria-label={`No ${text.toLowerCase()} logged`}
        className="control opacity-35"
      >
        {direction === "prev" && <Icon size={16} />}
        {direction === "prev" ? "Earlier" : "Later"}
        {direction === "next" && <Icon size={16} />}
      </span>
    )
  }
  return (
    <Link
      to="/days/$date"
      params={{ date }}
      aria-label={`${text}, ${dateLong(date)}`}
      className="control"
    >
      {direction === "prev" && <Icon size={16} />}
      {dateShort(date)}
      {direction === "next" && <Icon size={16} />}
    </Link>
  )
}
