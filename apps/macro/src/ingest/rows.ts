import {
  DUPLICATE_MINUTES,
  MIN_RESTING_KCAL,
  MORNING_BEFORE,
  REWEIGH_MINUTES,
  TIME_ZONE
} from "../config"
import type { EnergyDay, WeighIn } from "../lib/nutrition"
import type { EnergyTotal, Reading } from "./payload"

const MINUTE_MS = 60_000

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
})

/** The `YYYY-MM-DD` date and `HH:MM` time on a Los Angeles clock at an instant. */
export function localTime(at: number): { date: string; time: string } {
  const part = Object.fromEntries(
    wallClock.formatToParts(at).map(({ type, value }) => [type, value])
  ) as Record<string, string>
  return { date: `${part.year}-${part.month}-${part.day}`, time: `${part.hour}:${part.minute}` }
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Why a synced day or reading wasn't logged. */
export interface Skipped {
  date: string
  reason: string
}

/**
 * The weigh-ins to append: each day's morning reading that isn't logged yet.
 *
 * - A day's morning reading is its first reading before `MORNING_BEFORE`, or, when it's a
 *   re-weigh chain (readings `REWEIGH_MINUTES` or less apart), the chain's last reading.
 * - A chain that ended less than `REWEIGH_MINUTES` before `now` waits for the next sync, in
 *   case the next step onto the scale hasn't synced yet.
 * - A day that already has a morning row gets no second one, and a reading that matches a
 *   logged row (same day, `DUPLICATE_MINUTES` or less apart, or the same kg to ±0.01) is
 *   that row. Deleting a mis-weigh's row only sticks once it's gone from Apple Health too.
 */
export function newWeighIns(
  logged: WeighIn[],
  readings: Reading[],
  now: number
): { added: WeighIn[]; skipped: Skipped[] } {
  const mornings = new Map<string, Array<Reading & { time: string }>>()
  for (const reading of [...readings].sort((a, b) => a.at - b.at)) {
    const { date, time } = localTime(reading.at)
    if (time >= MORNING_BEFORE) continue
    mornings.set(date, [...(mornings.get(date) ?? []), { ...reading, time }])
  }

  const added: WeighIn[] = []
  const skipped: Skipped[] = []
  for (const [date, morning] of [...mornings].sort(([a], [b]) => a.localeCompare(b))) {
    let pick = morning[0]!
    for (const next of morning.slice(1)) {
      if (next.at - pick.at > REWEIGH_MINUTES * MINUTE_MS) break
      pick = next
    }
    if (now - pick.at < REWEIGH_MINUTES * MINUTE_MS) {
      skipped.push({
        date,
        reason: `reading is under ${REWEIGH_MINUTES} minutes old; a re-weigh may follow`
      })
      continue
    }

    const row: WeighIn = { date, time: pick.time, kg: Math.round(pick.kg * 100) / 100 }
    const same = logged.filter((existing) => existing.date === date)
    if (same.some((existing) => existing.time < MORNING_BEFORE)) {
      skipped.push({ date, reason: "morning reading already logged" })
    } else if (
      same.some(
        (existing) =>
          Math.abs(minutesOf(existing.time) - minutesOf(row.time)) <= DUPLICATE_MINUTES ||
          Math.abs(existing.kg - row.kg) <= 0.010_001
      )
    ) {
      skipped.push({ date, reason: "reading already logged" })
    } else {
      added.push(row)
    }
  }
  return { added, skipped }
}

/**
 * The energy days to append: finished days (before `today`) not logged yet, rounded to whole
 * kilocalories. A day under `MIN_RESTING_KCAL` resting, or missing either number, is still
 * syncing from the watch and is left for a later sync.
 */
export function newEnergyDays(
  logged: EnergyDay[],
  totals: EnergyTotal[],
  today: string
): { added: EnergyDay[]; skipped: Skipped[] } {
  const dates = new Set(logged.map((day) => day.date))
  const added: EnergyDay[] = []
  const skipped: Skipped[] = []
  for (const total of [...totals].sort((a, b) => a.date.localeCompare(b.date))) {
    const { date } = total
    if (date >= today) {
      skipped.push({ date, reason: "day isn't over" })
    } else if (dates.has(date)) {
      skipped.push({ date, reason: "already logged" })
    } else if (total.resting === null || total.active === null) {
      skipped.push({ date, reason: `no ${total.resting === null ? "resting" : "active"} energy` })
    } else if (Math.round(total.resting) < MIN_RESTING_KCAL) {
      skipped.push({ date, reason: `resting under ${MIN_RESTING_KCAL} kcal, still syncing` })
    } else {
      added.push({ date, resting: Math.round(total.resting), active: Math.round(total.active) })
    }
  }
  return { added, skipped }
}

export const weighInLine = (row: WeighIn) => `${row.date},${row.time},${row.kg.toFixed(2)}`
export const energyLine = (day: EnergyDay) => `${day.date},${day.resting},${day.active}`

/** Appends lines to a CSV's text, keeping every existing byte and ending with a newline. */
export function appendLines(text: string, lines: string[]): string {
  if (!lines.length) return text
  const base = text === "" || text.endsWith("\n") ? text : `${text}\n`
  return `${base}${lines.join("\n")}\n`
}
