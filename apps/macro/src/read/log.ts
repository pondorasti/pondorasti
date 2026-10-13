import { meals, weighIns } from "virtual:macro-content"
import { RECENT_DAYS, RECENT_WEEKS, ROLLING_DAYS, TIME_ZONE, WEIGHT_DAYS } from "../config"
import {
  addDays,
  calendarDays,
  dailyTotals,
  type DayTotals,
  groupMeals,
  type MealGroup,
  morningWeights,
  rollingAverage,
  sumEntries,
  type Totals,
  type WeekAverages,
  weeklyAverages,
  type WeightPoint
} from "../lib/nutrition"

export interface Day {
  date: string
  meals: MealGroup[]
  totals: Totals
  /** Nearest logged days on either side. */
  prev: string | null
  next: string | null
}

export interface Dashboard {
  /** Today's date in `TIME_ZONE`. */
  today: string
  /** The latest logged day, which is usually today. */
  latest: Day | null
  recent: { date: string; totals: DayTotals | null }[]
  weights: WeightPoint[]
  weeks: WeekAverages[]
}

const totals = dailyTotals(meals)
const dates = totals.map((day) => day.date)
const mornings = morningWeights(weighIns)
const trend = rollingAverage(mornings, ROLLING_DAYS)

export const localDate = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now)

export function getDay(date: string): Day | null {
  const index = dates.indexOf(date)
  if (index === -1) return null
  const entries = meals.filter((entry) => entry.date === date)
  return {
    date,
    meals: groupMeals(entries),
    totals: sumEntries(entries),
    prev: dates[index - 1] ?? null,
    next: dates[index + 1] ?? null
  }
}

export function getDashboard(): Dashboard {
  const last = dates.at(-1)
  const lastWeighIn = trend.at(-1)?.date
  return {
    today: localDate(),
    latest: last ? getDay(last) : null,
    recent: last ? calendarDays(totals, addDays(last, -(RECENT_DAYS - 1)), last) : [],
    weights: lastWeighIn
      ? trend.filter((point) => point.date > addDays(lastWeighIn, -WEIGHT_DAYS))
      : [],
    weeks: weeklyAverages(totals, mornings).slice(0, RECENT_WEEKS)
  }
}
