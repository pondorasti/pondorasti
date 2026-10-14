import { readFileSync } from "node:fs"
import { getPlatformProxy } from "wrangler"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { dailySummaries, listWorkouts, metricSamples, saveExport, syncStatus } from "./db"
import { exportBody } from "./fixtures"
import { parseExport } from "./parse"

const migration = readFileSync(
  new URL("../../migrations/0001_health.sql", import.meta.url).pathname,
  "utf8"
)

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>
let db: D1Database

beforeAll(async () => {
  proxy = await getPlatformProxy<Env>({ persist: false })
  db = proxy.env.DB
  const statements = migration
    .replaceAll(/--.*$/gm, "")
    .split(";")
    .filter((sql) => sql.trim())
  await db.batch(statements.map((sql) => db.prepare(sql)))
})

afterAll(() => proxy?.dispose())

beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM health_samples"),
    db.prepare("DELETE FROM health_workouts")
  ])
})

const save = (body: unknown, now?: string) => {
  const { samples, workouts } = parseExport(body)
  return saveExport(db, samples, workouts, now)
}

describe("saveExport", () => {
  it("is idempotent across repeated pushes", async () => {
    expect(await save(exportBody, "2026-10-13T08:00:00.000Z")).toEqual({ samples: 8, workouts: 1 })
    expect(await save(exportBody, "2026-10-13T09:00:00.000Z")).toEqual({ samples: 0, workouts: 0 })
    const { metrics } = await syncStatus(db)
    expect(metrics).toContainEqual(
      expect.objectContaining({
        metric: "step_count",
        samples: 1,
        last_updated: "2026-10-13T08:00:00.000Z"
      })
    )
  })

  it("replaces a day's running total when it is pushed again", async () => {
    const steps = (qty: number) => ({
      data: {
        metrics: [{ name: "step_count", data: [{ date: "2026-10-13 00:00:00 +0300", qty }] }]
      }
    })
    await save(steps(2000))
    expect(await save(steps(6500))).toEqual({ samples: 1, workouts: 0 })
    const [day] = await dailySummaries(db, "2026-10-13", "2026-10-13")
    expect(day.steps).toBe(6500)
  })

  it("splits large pushes into several statements", async () => {
    const data = Array.from({ length: 6000 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString(),
      Min: 60,
      Avg: 70 + (i % 10),
      Max: 90,
      source: "Alexandru’s Apple Watch"
    }))
    const body = { data: { metrics: [{ name: "heart_rate", units: "count/min", data }] } }
    expect(await save(body)).toEqual({ samples: 6000, workouts: 0 })
    const { samples, truncated } = await metricSamples(
      db,
      "heart_rate",
      "2026-10-01",
      "2026-10-05",
      10
    )
    expect(samples).toHaveLength(10)
    expect(truncated).toBe(true)
    expect(samples[0]).toMatchObject({
      qty: 70,
      min: 60,
      max: 90,
      source: "Alexandru’s Apple Watch"
    })
  })
})

describe("dailySummaries", () => {
  it("summarizes energy, steps, heart rate, sleep, weight and workouts per day", async () => {
    await save(exportBody)
    const [day12, day13] = await dailySummaries(db, "2026-10-12", "2026-10-13")
    expect(day12).toEqual({
      day: "2026-10-12",
      active_kcal: 600,
      basal_kcal: 1750,
      total_kcal: 2350,
      steps: 9876,
      resting_hr: 52,
      weight_kg: 80,
      heart_rate: { min: 48, avg: 71, max: 162 },
      sleep: {
        asleep_h: 7.25,
        core_h: 3.9,
        deep_h: 1.1,
        rem_h: 2.25,
        awake_h: 0.3,
        in_bed_h: 0,
        start: "2026-10-11 23:40:00 +0300",
        end: "2026-10-12 07:15:00 +0300"
      },
      workouts: [
        {
          name: "Traditional Strength Training",
          start: "2026-10-12 18:00:00 +0300",
          minutes: 65,
          active_kcal: 350
        }
      ]
    })
    expect(day13).toEqual({ day: "2026-10-13", active_kcal: 300 })
  })

  it("adds up unaggregated sleep segments", async () => {
    const segment = (value: string, startDate: string, endDate: string, qty: number) => ({
      startDate,
      endDate,
      qty,
      value
    })
    await save({
      data: {
        metrics: [
          {
            name: "sleep_analysis",
            units: "hr",
            data: [
              segment("In Bed", "2026-10-11 23:30:00 +0300", "2026-10-12 07:30:00 +0300", 8),
              segment("Core", "2026-10-11 23:45:00 +0300", "2026-10-12 03:45:00 +0300", 4),
              segment("Deep", "2026-10-12 03:45:00 +0300", "2026-10-12 05:15:00 +0300", 1.5),
              segment("REM", "2026-10-12 05:15:00 +0300", "2026-10-12 07:00:00 +0300", 1.75),
              segment("Awake", "2026-10-12 07:00:00 +0300", "2026-10-12 07:10:00 +0300", 0.17)
            ]
          }
        ]
      }
    })
    const [day] = await dailySummaries(db, "2026-10-12", "2026-10-12")
    expect(day.sleep).toEqual({
      asleep_h: 7.25,
      core_h: 4,
      deep_h: 1.5,
      rem_h: 1.75,
      awake_h: 0.17,
      in_bed_h: 8,
      start: "2026-10-11 23:45:00 +0300",
      end: "2026-10-12 07:00:00 +0300"
    })
  })
})

describe("metricSamples", () => {
  it("returns converted values with the exported timestamp and source", async () => {
    await save(exportBody)
    const { samples } = await metricSamples(db, "weight_body_mass", "2026-10-12", "2026-10-12", 10)
    expect(samples).toEqual([
      {
        date: "2026-10-12 07:31:00 +0300",
        day: "2026-10-12",
        stage: null,
        units: "kg",
        qty: 80,
        min: null,
        max: null,
        source: "Withings"
      }
    ])
  })
})

describe("listWorkouts", () => {
  it("returns workouts with their summary details", async () => {
    await save(exportBody)
    const [workout] = await listWorkouts(db, "2026-10-01", "2026-10-31")
    expect(workout).toMatchObject({
      name: "Traditional Strength Training",
      start: "2026-10-12 18:00:00 +0300",
      end: "2026-10-12 19:05:00 +0300",
      duration_min: 65,
      active_kcal: 350,
      total_kcal: 520,
      avg_hr: 122,
      max_hr: 158,
      details: { location: "Indoor", intensity: { qty: 5.1, units: "kcal/hr·kg" } }
    })
  })
})
