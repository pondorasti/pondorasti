import { z } from "zod"

/**
 * Health Auto Export's JSON (version 2) for Health Metrics, as its REST API automations POST
 * it: https://help.healthyapps.dev/en/health-auto-export/export-format/health-metrics. Only
 * the metrics below are read; any other metric in the payload is ignored.
 */
export const METRICS = {
  weight: "weight_body_mass",
  resting: "basal_energy_burned",
  active: "active_energy"
} as const

/** One scale reading, at the instant the scale took it. */
export interface Reading {
  /** Epoch milliseconds. */
  at: number
  kg: number
}

/** Energy for one calendar day, summed over the payload's points that fall on it. */
export interface EnergyTotal {
  date: string
  resting: number | null
  active: number | null
}

export interface HealthExport {
  readings: Reading[]
  energy: EnergyTotal[]
}

/** The payload isn't the export format this endpoint reads; the message says where. */
export class PayloadError extends Error {}

const Payload = z.object({
  data: z.object({
    metrics: z
      .array(z.object({ name: z.string(), units: z.string(), data: z.array(z.unknown()) }))
      .default([])
  })
})

const Point = z.object({ qty: z.number().nonnegative(), date: z.string() })

const KG_PER = { kg: 1, lb: 0.453_592_37, lbs: 0.453_592_37 } as Record<string, number>
const KCAL_PER = { kcal: 1, cal: 1, kj: 1 / 4.184 } as Record<string, number>

/** `yyyy-MM-dd HH:mm:ss Z`, as in `2026-11-27 08:31:12 -0800`; ISO 8601 is accepted too. */
const STAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(?:Z|([+-])(\d{2}):?(\d{2}))$/

/**
 * A timestamp's instant, and its calendar date as written: the phone's own day, which is what
 * a daily summary's `00:00:00` timestamp names.
 */
export function parseStamp(stamp: string): { at: number; date: string } | null {
  const match = STAMP.exec(stamp.trim())
  if (!match) return null
  const [, date, hours, minutes, seconds = "00", sign, offsetHours = "00", offsetMinutes = "00"] =
    match
  const local = Date.parse(`${date}T${hours}:${minutes}:${seconds}Z`)
  if (Number.isNaN(local)) return null
  const offset = (sign === "-" ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes))
  return { at: local - offset * 60_000, date: date! }
}

/** Reads the weigh-ins and daily energy out of a Health Auto Export payload. */
export function parseHealthExport(body: unknown): HealthExport {
  const payload = Payload.safeParse(body)
  if (!payload.success) {
    throw new PayloadError(
      `expected Health Auto Export JSON ({ "data": { "metrics": [...] } }): ${payload.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")}`
    )
  }

  const readings: Reading[] = []
  const energy = new Map<string, EnergyTotal>()
  for (const [index, metric] of payload.data.data.metrics.entries()) {
    const where = `data.metrics.${index} (${metric.name})`
    const kind =
      metric.name === METRICS.weight
        ? "weight"
        : metric.name === METRICS.resting
          ? "resting"
          : metric.name === METRICS.active
            ? "active"
            : null
    if (!kind) continue

    const units = metric.units.trim().toLowerCase()
    const factor = kind === "weight" ? KG_PER[units] : KCAL_PER[units]
    if (factor === undefined) {
      throw new PayloadError(`${where}: unsupported units "${metric.units}"`)
    }

    for (const [i, raw] of metric.data.entries()) {
      const point = Point.safeParse(raw)
      const stamp = point.success ? parseStamp(point.data.date) : null
      if (!point.success || !stamp) {
        throw new PayloadError(
          `${where}.data.${i}: expected { qty: number, date: "yyyy-MM-dd HH:mm:ss Z" }`
        )
      }
      const value = point.data.qty * factor
      if (kind === "weight") {
        readings.push({ at: stamp.at, kg: value })
      } else {
        const day = energy.get(stamp.date) ?? { date: stamp.date, resting: null, active: null }
        day[kind] = (day[kind] ?? 0) + value
        energy.set(stamp.date, day)
      }
    }
  }

  return {
    readings: readings.sort((a, b) => a.at - b.at),
    energy: [...energy.values()].sort((a, b) => a.date.localeCompare(b.date))
  }
}
