import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import {
  SUMMARY_METRICS,
  dailySummaries,
  listWorkouts,
  metricSamples,
  syncStatus
} from "../health/db"
import { call } from "./result"

const readOnly = { readOnlyHint: true, openWorldHint: false } as const

const DAY_MS = 24 * 60 * 60 * 1000

const range = {
  startDate: z.iso.date().describe("First day, YYYY-MM-DD (the phone's local date)"),
  endDate: z.iso.date().optional().describe("Last day, inclusive. Defaults to startDate")
}

function days(startDate: string, endDate = startDate, maxDays: number): [string, string] {
  if (endDate < startDate) throw new Error("endDate is before startDate")
  if (Date.parse(endDate) - Date.parse(startDate) >= maxDays * DAY_MS) {
    throw new Error(`At most ${maxDays} days per call`)
  }
  return [startDate, endDate]
}

/**
 * Apple Health data that Health Auto Export pushes to /health/ingest, read from D1.
 * Days are the phone's local calendar days; sleep counts toward the day you woke up.
 */
export function registerHealth(server: McpServer, env: Env) {
  server.registerTool(
    "health_daily_summary",
    {
      title: "Apple Health daily summary",
      description:
        "Per-day Apple Health totals: active_kcal, basal_kcal (resting energy), total_kcal, " +
        "steps, exercise_min, walking_running_km, flights_climbed, resting_hr, hrv_ms, " +
        "vo2_max, weight_kg, heart_rate {min, avg, max}, sleep (hours per stage, asleep_h, " +
        "start/end) and the day's workouts. Days with no data are omitted. Max 92 days.",
      inputSchema: z.object(range),
      annotations: readOnly
    },
    call(({ startDate, endDate }) => dailySummaries(env.DB, ...days(startDate, endDate, 92)))
  )

  server.registerTool(
    "health_list_workouts",
    {
      title: "List Apple Health workouts",
      description:
        "Apple Watch / Apple Health workouts in a date range, newest first (max 200): type, " +
        "start/end, duration_min, active_kcal, total_kcal, avg_hr/max_hr, distance_km, " +
        "plus details such as location, intensity (MET) and elevation. Max 366 days.",
      inputSchema: z.object(range),
      annotations: readOnly
    },
    call(({ startDate, endDate }) => listWorkouts(env.DB, ...days(startDate, endDate, 366)))
  )

  server.registerTool(
    "health_get_metric",
    {
      title: "Get Apple Health metric samples",
      description:
        "Raw stored samples of one metric, oldest first, with source. Names are Health Auto " +
        `Export's snake_case ones, e.g. ${[...SUMMARY_METRICS, "heart_rate", "sleep_analysis"].join(", ")}. ` +
        "Energy is in kcal, mass in kg, distance in km. health_sync_status lists what is stored.",
      inputSchema: z.object({
        metric: z.string().min(1),
        ...range,
        limit: z.number().int().min(1).max(2000).default(500)
      }),
      annotations: readOnly
    },
    call(({ metric, startDate, endDate, limit }) =>
      metricSamples(env.DB, metric, ...days(startDate, endDate, 366), limit)
    )
  )

  server.registerTool(
    "health_sync_status",
    {
      title: "Apple Health sync status",
      description:
        "Which metrics are stored, their first/last day and when each last changed. Use it to " +
        "check whether the phone has synced recently before drawing conclusions.",
      inputSchema: z.object({}),
      annotations: readOnly
    },
    call(() => syncStatus(env.DB))
  )
}
