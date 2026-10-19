import { describe, expect, it } from "vite-plus/test"
import { exportBody } from "./fixtures"
import { parseDate, parseExport } from "./parse"

describe("parseDate", () => {
  it("reads the app's format, keeping the local day", () => {
    expect(parseDate("2026-10-12 00:30:00 +0300")).toEqual({
      iso: "2026-10-11T21:30:00.000Z",
      day: "2026-10-12"
    })
  })

  it("accepts ISO 8601 and bare dates", () => {
    expect(parseDate("2026-10-12T07:00:00-08:00")?.iso).toBe("2026-10-12T15:00:00.000Z")
    expect(parseDate("2026-10-12")).toEqual({ iso: "2026-10-12T00:00:00.000Z", day: "2026-10-12" })
  })

  it("rejects anything else", () => {
    expect(parseDate("yesterday")).toBeUndefined()
    expect(parseDate("2026-13-40 00:00:00 +0000")).toBeUndefined()
    expect(parseDate(42)).toBeUndefined()
  })
})

describe("parseExport", () => {
  const { samples, workouts, skipped } = parseExport(exportBody)
  const sample = (metric: string) => samples.find((row) => row.metric === metric)

  it("normalizes energy to kcal and weight to kg", () => {
    expect(sample("active_energy")).toMatchObject({ units: "kcal", day: "2026-10-12" })
    expect(sample("active_energy")?.qty).toBeCloseTo(600)
    expect(sample("weight_body_mass")?.units).toBe("kg")
    expect(sample("weight_body_mass")?.qty).toBeCloseTo(80)
  })

  it("keeps heart rate min/avg/max", () => {
    expect(sample("heart_rate")).toMatchObject({ qty: 71.4, min: 48, max: 162 })
  })

  it("files aggregated sleep under the wake-up day with total hours", () => {
    expect(sample("sleep_analysis")).toMatchObject({ day: "2026-10-12", variant: "", qty: 7.25 })
  })

  it("keys unaggregated sleep segments by stage and wake-up day", () => {
    const parsed = parseExport({
      data: {
        metrics: [
          {
            name: "sleep_analysis",
            units: "hr",
            data: [
              {
                startDate: "2026-10-11 23:40:00 +0300",
                endDate: "2026-10-12 00:20:00 +0300",
                qty: 0.67,
                value: "In Bed"
              }
            ]
          }
        ]
      }
    })
    expect(parsed.samples[0]).toMatchObject({ variant: "in_bed", day: "2026-10-12" })
  })

  it("summarizes workouts without their series", () => {
    expect(workouts).toHaveLength(1)
    const [workout] = workouts
    expect(workout).toMatchObject({
      id: "9F1C2B44-3D2A-4E1B-8C55-0A7E6D2B9F10",
      day: "2026-10-12",
      duration_s: 3900,
      total_kcal: 520,
      avg_hr: 121.6,
      max_hr: 158,
      distance_km: null
    })
    expect(workout.active_kcal).toBeCloseTo(350)
    expect(JSON.parse(workout.data)).not.toHaveProperty("heartRateData")
    expect(JSON.parse(workout.data)).not.toHaveProperty("route")
    expect(skipped).toBe(0)
  })

  it("derives v1 workout fields and an id", () => {
    const [workout] = parseExport({
      data: {
        workouts: [
          {
            name: "Running",
            start: "2026-10-12 07:00:00 -0800",
            end: "2026-10-12 07:30:00 -0800",
            activeEnergy: { qty: 300, units: "kcal" },
            distance: { qty: 5000, units: "m" },
            heartRateData: [{ qty: 140 }, { qty: 160 }]
          }
        ]
      }
    }).workouts
    expect(workout).toMatchObject({
      id: "Running|2026-10-12T15:00:00.000Z",
      duration_s: 1800,
      active_kcal: 300,
      avg_hr: 150,
      max_hr: 160,
      distance_km: 5
    })
  })

  it("counts unreadable points instead of failing", () => {
    const parsed = parseExport({
      data: { metrics: [{ name: "step_count", data: [{ qty: 1 }, "x"] }, {}], workouts: [{}] }
    })
    expect(parsed).toMatchObject({ samples: [], workouts: [], skipped: 4 })
  })

  it("rejects bodies that are not exports", () => {
    expect(() => parseExport({ metrics: [] })).toThrow("Expected a Health Auto Export JSON body")
  })
})
