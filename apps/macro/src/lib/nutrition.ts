import { z } from "zod/mini"
import { MORNING_BEFORE } from "../config"

export const MEALS = ["breakfast", "lunch", "dinner", "dessert", "snack", "post-workout"] as const
export const Meal = z.enum(MEALS)
export type Meal = z.infer<typeof Meal>

/** A calendar date, `YYYY-MM-DD`, that exists. */
export const IsoDate = z.string().check(
  z.regex(/^\d{4}-\d{2}-\d{2}$/, "expected a YYYY-MM-DD date"),
  z.refine((value) => {
    const ms = fromIso(value)
    return !Number.isNaN(ms) && toIso(ms) === value
  }, "not a real calendar date")
)

/** A 24-hour local time, `HH:MM`. */
export const Time = z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM (24h)"))

export interface Entry {
  date: string
  time: string
  meal: Meal
  item: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Null when the row left fiber blank. */
  fiber: number | null
}

export interface WeighIn {
  date: string
  time: string
  kg: number
}

export interface Totals {
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Sum of the entries with fiber logged; blanks count as 0. */
  fiber: number
  /** Entries whose fiber was blank, so `fiber` may be low. */
  fiberUnknown: number
  entries: number
}

export interface DayTotals extends Totals {
  date: string
}

export interface MealGroup {
  meal: Meal
  entries: Entry[]
  totals: Totals
}

export interface WeightPoint {
  date: string
  time: string
  kg: number
  /** Mean of the morning readings in the `ROLLING_DAYS` calendar days ending on `date`. */
  average: number
}

export interface WeekAverages {
  /** Monday of the week. */
  week: string
  /** Days in the week with any food logged; the averages are over these days. */
  days: number
  kcal: number | null
  protein: number | null
  fiber: number | null
  /** Mean morning weight over the week's readings. */
  kg: number | null
}

const DAY_MS = 86_400_000

export const fromIso = (date: string) => Date.parse(`${date}T00:00:00Z`)
export const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (date: string, days: number) => toIso(fromIso(date) + days * DAY_MS)

/** Monday on or before `date`. */
export const weekStart = (date: string) =>
  addDays(date, -((new Date(fromIso(date)).getUTCDay() + 6) % 7))

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

const byTime = <T extends { date: string; time: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.time.localeCompare(b.time)

export function sumEntries(entries: Entry[]): Totals {
  const totals: Totals = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    fiberUnknown: 0,
    entries: entries.length
  }
  for (const entry of entries) {
    totals.kcal += entry.kcal
    totals.protein += entry.protein
    totals.carbs += entry.carbs
    totals.fat += entry.fat
    if (entry.fiber === null) totals.fiberUnknown++
    else totals.fiber += entry.fiber
  }
  for (const key of ["kcal", "protein", "carbs", "fat", "fiber"] as const) {
    totals[key] = round(totals[key])
  }
  return totals
}

/** Totals for every logged day, oldest first. */
export function dailyTotals(entries: Entry[]): DayTotals[] {
  const days = new Map<string, Entry[]>()
  for (const entry of entries) days.set(entry.date, [...(days.get(entry.date) ?? []), entry])
  return [...days.keys()].sort().map((date) => ({ date, ...sumEntries(days.get(date)!) }))
}

/** One slot per calendar day from `from` to `to`, null where nothing was logged. */
export function calendarDays(totals: DayTotals[], from: string, to: string) {
  const byDate = new Map(totals.map((day) => [day.date, day]))
  const days: { date: string; totals: DayTotals | null }[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push({ date, totals: byDate.get(date) ?? null })
  }
  return days
}

/**
 * A day's entries in time order, grouped into runs of the same meal, so an afternoon snack
 * and an evening snack stay apart.
 */
export function groupMeals(entries: Entry[]): MealGroup[] {
  const runs: { meal: Meal; entries: Entry[] }[] = []
  for (const entry of [...entries].sort(byTime)) {
    const last = runs.at(-1)
    if (last?.meal === entry.meal) last.entries.push(entry)
    else runs.push({ meal: entry.meal, entries: [entry] })
  }
  return runs.map((run) => ({ ...run, totals: sumEntries(run.entries) }))
}

/** The first reading before `MORNING_BEFORE` on each day, oldest first. */
export function morningWeights(weighIns: WeighIn[]): WeighIn[] {
  const mornings = new Map<string, WeighIn>()
  for (const reading of [...weighIns].sort(byTime)) {
    if (reading.time < MORNING_BEFORE && !mornings.has(reading.date)) {
      mornings.set(reading.date, reading)
    }
  }
  return [...mornings.values()]
}

/**
 * Pairs each reading with the mean of the readings in the `days` calendar days ending on its
 * date. The window is by date, not count, so gaps in logging shrink it rather than reach back.
 */
export function rollingAverage(readings: WeighIn[], days: number): WeightPoint[] {
  const sorted = [...readings].sort(byTime)
  return sorted.map((reading) => {
    const from = addDays(reading.date, -(days - 1))
    const window = sorted.filter((other) => other.date >= from && other.date <= reading.date)
    return { ...reading, average: round(mean(window.map((other) => other.kg))!, 2) }
  })
}

/** Averages per Monday-start week, newest first, over the days that have food logged. */
export function weeklyAverages(totals: DayTotals[], mornings: WeighIn[]): WeekAverages[] {
  const weeks = new Map<string, { days: DayTotals[]; kg: number[] }>()
  const week = (date: string) => {
    const key = weekStart(date)
    if (!weeks.has(key)) weeks.set(key, { days: [], kg: [] })
    return weeks.get(key)!
  }
  for (const day of totals) week(day.date).days.push(day)
  for (const reading of mornings) week(reading.date).kg.push(reading.kg)
  const average = (values: number[], digits: number) => {
    const value = mean(values)
    return value === null ? null : round(value, digits)
  }
  return [...weeks.keys()]
    .sort()
    .reverse()
    .map((key) => {
      const { days, kg } = weeks.get(key)!
      return {
        week: key,
        days: days.length,
        kcal: average(
          days.map((day) => day.kcal),
          0
        ),
        protein: average(
          days.map((day) => day.protein),
          1
        ),
        fiber: average(
          days.map((day) => day.fiber),
          1
        ),
        kg: average(kg, 2)
      }
    })
}
