/**
 * Health Auto Export's JSON format (export version 2, v1 workouts tolerated):
 * https://help.healthyapps.dev/en/health-auto-export/export-format
 * `{ data: { metrics: [{ name, units, data: [point] }], workouts: [workout] } }`
 */

type Json = Record<string, unknown>

export type SampleRow = {
  metric: string
  start: string
  variant: string
  day: string
  units: string | null
  qty: number | null
  min: number | null
  max: number | null
  data: string
}

export type WorkoutRow = {
  id: string
  name: string
  start: string
  end: string
  day: string
  duration_s: number | null
  active_kcal: number | null
  total_kcal: number | null
  avg_hr: number | null
  max_hr: number | null
  distance_km: number | null
  data: string
}

export type ParsedExport = { samples: SampleRow[]; workouts: WorkoutRow[]; skipped: number }

/** The help center spells body weight `weight_&_body_mass`; the app sends `weight_body_mass`. */
const ALIASES: Record<string, string> = { "weight_&_body_mass": "weight_body_mass" }

const CONVERSIONS: Record<string, [units: string, factor: number]> = {
  kJ: ["kcal", 1 / 4.184],
  lb: ["kg", 0.453_592_37],
  lbs: ["kg", 0.453_592_37],
  mi: ["km", 1.609_344]
}

const DISTANCE_KM: Record<string, number> = { km: 1, m: 0.001, mi: 1.609_344, yd: 0.000_914_4 }

// "2024-02-06 14:30:00 -0800" (the app's format), ISO 8601, or a bare date
const DATE =
  /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:\s*(Z|[+-]\d{2}:?\d{2}))?)?$/

/** `day` is the calendar day as written by the phone, i.e. in its local time zone. */
export function parseDate(value: unknown): { iso: string; day: string } | undefined {
  if (typeof value !== "string") return undefined
  const match = DATE.exec(value.trim())
  if (!match) return undefined
  const [, day, time = "00:00:00", zone = "Z"] = match
  const offset = zone === "Z" ? zone : `${zone.slice(0, 3)}:${zone.slice(-2)}`
  const date = new Date(`${day}T${time}${offset}`)
  if (Number.isNaN(date.getTime())) return undefined
  return { iso: date.toISOString(), day }
}

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined)

function convert(qty: number | undefined, units: string | undefined) {
  const conversion = units ? CONVERSIONS[units] : undefined
  if (qty === undefined || !conversion) return { qty, units }
  return { qty: qty * conversion[1], units: conversion[0] }
}

/** `{ qty, units }` objects, converted to kcal / kg / km where applicable. */
function quantity(value: unknown) {
  if (!isObject(value)) return undefined
  return convert(num(value.qty), str(value.units)).qty
}

const slug = (value: string) => value.trim().toLowerCase().replaceAll(/\W+/g, "_")

function parseSample(metric: string, metricUnits: string | undefined, point: Json) {
  const units = str(point.units) ?? metricUnits
  let start = parseDate(point.date ?? point.startDate)
  let day = start?.day
  let variant = ""
  let qty = num(point.qty) ?? num(point.Avg)

  if (metric === "sleep_analysis") {
    const stage = str(point.value)
    if (stage) {
      // One segment per sleep stage; it counts toward the day you woke up
      start = parseDate(point.startDate ?? point.date)
      day = parseDate(point.endDate)?.day ?? start?.day
      variant = slug(stage)
    } else {
      day = parseDate(point.sleepEnd)?.day ?? day
      qty = num(point.totalSleep) ?? qty
    }
  }
  if (!start || !day) return undefined

  const converted = convert(qty, units)
  return {
    metric,
    start: start.iso,
    variant,
    day,
    units: converted.units ?? null,
    qty: converted.qty ?? null,
    min: convert(num(point.Min), units).qty ?? null,
    max: convert(num(point.Max), units).qty ?? null,
    data: JSON.stringify(point)
  } satisfies SampleRow
}

function seriesStats(series: unknown) {
  if (!Array.isArray(series)) return {}
  const values = series.flatMap((point) => {
    const value = isObject(point) ? (num(point.Avg) ?? num(point.qty)) : undefined
    return value === undefined ? [] : [value]
  })
  if (values.length === 0) return {}
  const sum = values.reduce((a, b) => a + b, 0)
  return { avg: sum / values.length, max: Math.max(...values), sum }
}

function parseWorkout(workout: Json): WorkoutRow | undefined {
  const name = str(workout.name) ?? "Workout"
  const start = parseDate(workout.start)
  const end = parseDate(workout.end) ?? start
  if (!start || !end) return undefined

  const heartRate = isObject(workout.heartRate) ? workout.heartRate : {}
  const heartRateSeries = seriesStats(workout.heartRateData)
  const distance = isObject(workout.distance) ? workout.distance : {}
  const distanceFactor = DISTANCE_KM[str(distance.units) ?? ""]
  const distanceQty = num(distance.qty)
  const duration =
    num(workout.duration) ?? ((Date.parse(end.iso) - Date.parse(start.iso)) / 1000 || undefined)

  // Route points and per-minute series are large; the summary fields above cover them
  const summary = Object.fromEntries(
    Object.entries(workout).filter(([, value]) => !Array.isArray(value))
  )

  return {
    id: str(workout.id) ?? `${name}|${start.iso}`,
    name,
    start: start.iso,
    end: end.iso,
    day: start.day,
    duration_s: duration ?? null,
    // v1 exports send activeEnergy as { qty, units }; in v2 it is a per-minute series
    active_kcal:
      quantity(workout.activeEnergyBurned) ??
      quantity(workout.activeEnergy) ??
      seriesStats(workout.activeEnergy).sum ??
      null,
    total_kcal: quantity(workout.totalEnergy) ?? null,
    avg_hr:
      quantity(workout.avgHeartRate) ?? quantity(heartRate.avg) ?? heartRateSeries.avg ?? null,
    max_hr:
      quantity(workout.maxHeartRate) ?? quantity(heartRate.max) ?? heartRateSeries.max ?? null,
    distance_km:
      distanceQty !== undefined && distanceFactor !== undefined
        ? distanceQty * distanceFactor
        : null,
    data: JSON.stringify(summary)
  }
}

/** Throws only when the body isn't an export at all; unreadable points are counted as skipped. */
export function parseExport(body: unknown): ParsedExport {
  if (!isObject(body) || !isObject(body.data)) {
    throw new Error('Expected a Health Auto Export JSON body: { "data": { ... } }')
  }
  const { metrics = [], workouts = [] } = body.data
  const result: ParsedExport = { samples: [], workouts: [], skipped: 0 }

  for (const metric of Array.isArray(metrics) ? metrics : []) {
    const rawName = isObject(metric) ? str(metric.name) : undefined
    if (!isObject(metric) || !rawName || !Array.isArray(metric.data)) {
      result.skipped++
      continue
    }
    const name = ALIASES[rawName] ?? rawName
    for (const point of metric.data) {
      const row = isObject(point) ? parseSample(name, str(metric.units), point) : undefined
      if (row) result.samples.push(row)
      else result.skipped++
    }
  }

  for (const workout of Array.isArray(workouts) ? workouts : []) {
    const row = isObject(workout) ? parseWorkout(workout) : undefined
    if (row) result.workouts.push(row)
    else result.skipped++
  }

  return result
}
