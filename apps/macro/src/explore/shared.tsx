import { Link } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TARGETS } from "../config"
import { dateShort, grams } from "../lib/format"
import { type Entry, IsoDate, type MealGroup } from "../lib/nutrition"
import { dashboardQuery, dayQuery } from "../read/queries"

export const DIRECTIONS = [
  { id: "a", to: "/explore/a", name: "FDA label", blurb: "Strict panel, foods as ingredients" },
  { id: "b", to: "/explore/b", name: "Label + log", blurb: "Label hero beside a timed food log" },
  { id: "c", to: "/explore/c", name: "Receipt", blurb: "Itemized tape, totals at the bottom" },
  { id: "d", to: "/explore/d", name: "Ledger label", blurb: "Foods as rows of one big label" }
] as const

export type DirectionId = (typeof DIRECTIONS)[number]["id"]

export const validateExploreSearch = (search: Record<string, unknown>): { date?: string } =>
  typeof search.date === "string" && IsoDate.safeParse(search.date).success
    ? { date: search.date }
    : {}

/** The requested day, or the latest logged one; null when there's nothing to show. */
export async function loadExploreDay(queryClient: QueryClient, date: string | undefined) {
  const target = date ?? (await queryClient.fetchQuery(dashboardQuery)).latest?.date
  if (!target) return null
  return (await queryClient.fetchQuery(dayQuery(target))) ? target : null
}

/** Whole percent of a target; fiber is measured against the bottom of its range. */
export const pct = (value: number, target: number) => Math.round((value / target) * 100)

/** `floor` targets are minimums worth reaching; carbs and fat are guides, so passing them isn't a win. */
export const NUTRIENTS = [
  { key: "fat", label: "Total Fat", target: TARGETS.fat, indent: false, floor: false },
  { key: "carbs", label: "Total Carbohydrate", target: TARGETS.carbs, indent: false, floor: false },
  { key: "fiber", label: "Dietary Fiber", target: TARGETS.fiber.min, indent: true, floor: true },
  { key: "protein", label: "Protein", target: TARGETS.protein, indent: false, floor: true }
] as const

export const kcalShare = (totals: {
  kcal: number
  protein: number
  carbs: number
  fat: number
}) => {
  const protein = totals.protein * 4
  const carbs = totals.carbs * 4
  const fat = totals.fat * 9
  const sum = protein + carbs + fat || 1
  return {
    protein: Math.round((protein / sum) * 100),
    carbs: Math.round((carbs / sum) * 100),
    fat: Math.round((fat / sum) * 100)
  }
}

export const fiberText = (value: number | null) => (value === null ? "–" : grams(value))

export const allEntries = (meals: MealGroup[]): (Entry & { run: number })[] =>
  meals.flatMap((group, run) => group.entries.map((entry) => ({ ...entry, run })))

/** Direction switcher and day stepper, kept outside the designs so they compare cleanly. */
export function ExploreBar({
  current,
  date,
  prev,
  next,
  tone = "app"
}: {
  current: DirectionId
  date: string
  prev: string | null
  next: string | null
  tone?: "app" | "paper"
}) {
  const pill =
    tone === "paper"
      ? "bg-black/[0.06] text-black hover:bg-black/10"
      : "bg-surface text-ink hover:opacity-80"
  const active = tone === "paper" ? "bg-black text-white" : "bg-ink text-page"
  return (
    <nav
      aria-label="Design directions"
      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
    >
      <div className="flex items-center gap-1.5">
        <Link to="/explore" className={`mr-1 rounded-full px-3 py-1.5 ${pill}`}>
          Explore
        </Link>
        {DIRECTIONS.map((direction) => (
          <Link
            key={direction.id}
            to={direction.to}
            search={{ date }}
            title={direction.name}
            aria-current={direction.id === current ? "page" : undefined}
            className={`inline-flex size-8 items-center justify-center rounded-full font-medium uppercase ${
              direction.id === current ? active : pill
            }`}
          >
            {direction.id}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <DayStep
          to={DIRECTIONS.find((d) => d.id === current)!.to}
          date={prev}
          dir="prev"
          pill={pill}
        />
        <DayStep
          to={DIRECTIONS.find((d) => d.id === current)!.to}
          date={next}
          dir="next"
          pill={pill}
        />
      </div>
    </nav>
  )
}

function DayStep({
  to,
  date,
  dir,
  pill
}: {
  to: string
  date: string | null
  dir: "prev" | "next"
  pill: string
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight
  const className = `inline-flex h-8 items-center gap-1 rounded-full px-3 tabular-nums ${pill}`
  if (!date) {
    return (
      <span aria-disabled="true" className={`${className} pointer-events-none opacity-35`}>
        {dir === "prev" && <Icon size={14} />}
        {dir === "prev" ? "Earlier" : "Later"}
        {dir === "next" && <Icon size={14} />}
      </span>
    )
  }
  return (
    <Link to={to} search={{ date }} className={className}>
      {dir === "prev" && <Icon size={14} />}
      {dateShort(date)}
      {dir === "next" && <Icon size={14} />}
    </Link>
  )
}
