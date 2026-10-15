import { parseDate, type SampleRow, type WorkoutRow } from "./parse"

/**
 * Rows go in as one JSON array parameter per statement (expanded with json_each), so a
 * push of thousands of points is a handful of D1 queries. D1 caps a value at 2 MB.
 */
const CHUNK_BYTES = 500_000

function chunk(rows: object[]) {
  const chunks: string[] = []
  let current: string[] = []
  let size = 0
  for (const row of rows) {
    const encoded = JSON.stringify(row)
    if (current.length > 0 && size + encoded.length > CHUNK_BYTES) {
      chunks.push(`[${current.join(",")}]`)
      current = []
      size = 0
    }
    current.push(encoded)
    size += encoded.length + 1
  }
  if (current.length > 0) chunks.push(`[${current.join(",")}]`)
  return chunks
}

/** Builds an idempotent upsert: an unchanged row is not rewritten (and not counted). */
function upsert(table: string, columns: string[], key: string[]) {
  const values = columns.map((column) => `j.value ->> '${column}'`).join(", ")
  const updates = columns
    .filter((column) => !key.includes(column))
    .map((column) => `${column} = excluded.${column}`)
  return `INSERT INTO ${table} (${columns.join(", ")}, updated_at)
    SELECT ${values}, ?2 FROM json_each(?1) AS j WHERE true
    ON CONFLICT (${key.join(", ")}) DO UPDATE SET ${updates.join(", ")}, updated_at = excluded.updated_at
    WHERE ${table}.data IS NOT excluded.data`
}

const SAMPLE_COLUMNS = ["metric", "start", "variant", "day", "units", "qty", "min", "max", "data"]
const WORKOUT_COLUMNS = [
  "id",
  "name",
  "start",
  "end",
  "day",
  "duration_s",
  "active_kcal",
  "total_kcal",
  "avg_hr",
  "max_hr",
  "distance_km",
  "data"
]
const UPSERT_SAMPLES = upsert("health_samples", SAMPLE_COLUMNS, ["metric", "start", "variant"])
const UPSERT_WORKOUTS = upsert("health_workouts", WORKOUT_COLUMNS, ["id"])

/** One transaction; returns how many rows were inserted or changed. */
export async function saveExport(
  db: D1Database,
  samples: SampleRow[],
  workouts: WorkoutRow[],
  now = new Date().toISOString()
) {
  const statements = [
    ...chunk(samples).map((json) => ({ table: "samples" as const, json, sql: UPSERT_SAMPLES })),
    ...chunk(workouts).map((json) => ({ table: "workouts" as const, json, sql: UPSERT_WORKOUTS }))
  ]
  const written = { samples: 0, workouts: 0 }
  if (statements.length === 0) return written
  const results = await db.batch(statements.map(({ sql, json }) => db.prepare(sql).bind(json, now)))
  results.forEach((result, i) => {
    written[statements[i].table] += result.meta.changes
  })
  return written
}

const round = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined
    ? undefined
    : Math.round(value * 10 ** digits) / 10 ** digits

type Aggregate = "sum" | "avg"

/** Daily summary fields and the Health Auto Export metric each one comes from. */
const DAILY: Record<string, [metric: string, aggregate: Aggregate, digits: number]> = {
  active_kcal: ["active_energy", "sum", 0],
  basal_kcal: ["basal_energy_burned", "sum", 0],
  steps: ["step_count", "sum", 0],
  exercise_min: ["apple_exercise_time", "sum", 0],
  walking_running_km: ["walking_running_distance", "sum", 2],
  flights_climbed: ["flights_climbed", "sum", 0],
  resting_hr: ["resting_heart_rate", "avg", 0],
  hrv_ms: ["heart_rate_variability", "avg", 0],
  vo2_max: ["vo2_max", "avg", 1],
  weight_kg: ["weight_body_mass", "avg", 1]
}

export const SUMMARY_METRICS = [...new Set(Object.values(DAILY).map(([metric]) => metric))]

type SleepRow = { day: string; start: string; variant: string; qty: number | null; data: string }

const SLEEP_STAGES = ["core", "deep", "rem", "awake", "in_bed"] as const
const ASLEEP_STAGES = new Set(["core", "deep", "rem", "asleep", "unspecified"])

type Sleep = {
  asleep_h?: number
  core_h?: number
  deep_h?: number
  rem_h?: number
  awake_h?: number
  in_bed_h?: number
  start?: string
  end?: string
}

/** Aggregated exports send one row per night; unaggregated ones send per-stage segments. */
function summarizeSleep(rows: SleepRow[]) {
  const hours: Record<string, number> = {}
  const add = (stage: string, value: unknown) => {
    if (typeof value === "number") hours[stage] = (hours[stage] ?? 0) + value
  }
  // Reported as exported (phone-local with offset), compared as instants
  let start: { at: string; ms: number } | undefined
  let end: { at: string; ms: number } | undefined
  const instant = (value: unknown) => {
    const parsed = parseDate(value)
    return parsed && typeof value === "string"
      ? { at: value, ms: Date.parse(parsed.iso) }
      : undefined
  }
  for (const row of rows) {
    const data = JSON.parse(row.data) as Record<string, unknown>
    let rowStart = instant(row.variant ? (data.startDate ?? data.date) : data.sleepStart)
    let rowEnd = instant(row.variant ? data.endDate : data.sleepEnd)
    if (row.variant) {
      add(row.variant, row.qty)
      if (ASLEEP_STAGES.has(row.variant)) add("total", row.qty)
      else rowStart = rowEnd = undefined
    } else {
      for (const stage of ["core", "deep", "rem", "awake", "inBed"] as const) {
        add(stage === "inBed" ? "in_bed" : stage, data[stage])
      }
      add("total", row.qty)
    }
    if (rowStart && (!start || rowStart.ms < start.ms)) start = rowStart
    if (rowEnd && (!end || rowEnd.ms > end.ms)) end = rowEnd
  }
  const sleep: Sleep = { asleep_h: round(hours.total, 2), start: start?.at, end: end?.at }
  for (const stage of SLEEP_STAGES) {
    if (hours[stage] !== undefined) sleep[`${stage}_h`] = round(hours[stage], 2)
  }
  return sleep
}

export type DailySummary = {
  day: string
  heart_rate?: { min?: number; avg?: number; max?: number }
  sleep?: Sleep
  workouts?: { name: string; start: string; minutes?: number; active_kcal?: number }[]
} & { [field: string]: unknown }

type MetricDay = {
  day: string
  metric: string
  sum: number | null
  avg: number | null
  min: number | null
  max: number | null
}

export async function dailySummaries(db: D1Database, from: string, to: string) {
  const metrics = [...SUMMARY_METRICS, "heart_rate"]
  const [metricDays, sleepRows, workoutRows] = await db.batch<unknown>([
    db
      .prepare(
        `SELECT day, metric, SUM(qty) AS sum, AVG(qty) AS avg,
          MIN(COALESCE(min, qty)) AS min, MAX(COALESCE(max, qty)) AS max
        FROM health_samples
        WHERE day BETWEEN ?1 AND ?2 AND metric IN (SELECT value FROM json_each(?3))
        GROUP BY day, metric`
      )
      .bind(from, to, JSON.stringify(metrics)),
    db
      .prepare(
        `SELECT day, start, variant, qty, data FROM health_samples
        WHERE metric = 'sleep_analysis' AND day BETWEEN ?1 AND ?2`
      )
      .bind(from, to),
    db
      .prepare(
        `SELECT day, name, COALESCE(data ->> '$.start', start) AS start, duration_s, active_kcal
        FROM health_workouts WHERE day BETWEEN ?1 AND ?2 ORDER BY health_workouts.start`
      )
      .bind(from, to)
  ])

  const days = new Map<string, DailySummary>()
  const summary = (day: string) => {
    let entry = days.get(day)
    if (!entry) days.set(day, (entry = { day }))
    return entry
  }

  for (const row of metricDays.results as MetricDay[]) {
    if (row.metric === "heart_rate") {
      summary(row.day).heart_rate = {
        min: round(row.min, 0),
        avg: round(row.avg, 0),
        max: round(row.max, 0)
      }
      continue
    }
    for (const [field, [metric, aggregate, digits]] of Object.entries(DAILY)) {
      if (metric === row.metric) summary(row.day)[field] = round(row[aggregate], digits)
    }
  }
  for (const entry of days.values()) {
    if (typeof entry.active_kcal === "number" && typeof entry.basal_kcal === "number") {
      entry.total_kcal = entry.active_kcal + entry.basal_kcal
    }
  }

  const sleepByDay = Map.groupBy(sleepRows.results as SleepRow[], (row) => row.day)
  for (const [day, rows] of sleepByDay) summary(day).sleep = summarizeSleep(rows)

  type Workout = Pick<WorkoutRow, "day" | "name" | "start" | "duration_s" | "active_kcal">
  for (const row of workoutRows.results as Workout[]) {
    ;(summary(row.day).workouts ??= []).push({
      name: row.name,
      start: row.start,
      minutes: round(row.duration_s === null ? null : row.duration_s / 60, 0),
      active_kcal: round(row.active_kcal, 0)
    })
  }

  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export async function listWorkouts(db: D1Database, from: string, to: string) {
  const { results } = await db
    .prepare(
      `SELECT * FROM health_workouts WHERE day BETWEEN ?1 AND ?2 ORDER BY start DESC LIMIT 200`
    )
    .bind(from, to)
    .all<WorkoutRow & { updated_at: string }>()
  return results.map((row) => {
    const details = JSON.parse(row.data) as Record<string, unknown>
    const { start = row.start, end = row.end } = details
    for (const key of ["id", "name", "start", "end", "duration"]) delete details[key]
    return {
      id: row.id,
      name: row.name,
      start,
      end,
      day: row.day,
      duration_min: round(row.duration_s === null ? null : row.duration_s / 60, 1),
      active_kcal: round(row.active_kcal, 0),
      total_kcal: round(row.total_kcal, 0),
      avg_hr: round(row.avg_hr, 0),
      max_hr: round(row.max_hr, 0),
      distance_km: round(row.distance_km, 2),
      details
    }
  })
}

export async function metricSamples(
  db: D1Database,
  metric: string,
  from: string,
  to: string,
  limit: number
) {
  const { results } = await db
    .prepare(
      `SELECT COALESCE(data ->> '$.date', data ->> '$.startDate', start) AS date, day,
        NULLIF(variant, '') AS stage, units, ROUND(qty, 3) AS qty, ROUND(min, 3) AS min,
        ROUND(max, 3) AS max, data ->> '$.source' AS source
      FROM health_samples WHERE metric = ?1 AND day BETWEEN ?2 AND ?3
      ORDER BY start LIMIT ?4`
    )
    .bind(metric, from, to, limit + 1)
    .all()
  return { metric, truncated: results.length > limit, samples: results.slice(0, limit) }
}

export async function syncStatus(db: D1Database) {
  const [metrics, workouts] = await db.batch([
    db.prepare(
      `SELECT metric, COUNT(*) AS samples, MIN(day) AS first_day, MAX(day) AS last_day,
        MAX(updated_at) AS last_updated
      FROM health_samples GROUP BY metric ORDER BY metric`
    ),
    db.prepare(
      `SELECT COUNT(*) AS workouts, MIN(day) AS first_day, MAX(day) AS last_day,
        MAX(updated_at) AS last_updated
      FROM health_workouts`
    )
  ])
  return { metrics: metrics.results, workouts: workouts.results[0] }
}
