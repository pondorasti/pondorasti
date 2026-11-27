import { describe, expect, it } from "vite-plus/test"
import { PayloadError, parseHealthExport, parseStamp } from "./payload"

describe("parseStamp", () => {
  it("reads Health Auto Export's yyyy-MM-dd HH:mm:ss Z, keeping the date as written", () => {
    expect(parseStamp("2026-11-27 08:31:12 -0800")).toEqual({
      at: Date.UTC(2026, 10, 27, 16, 31, 12),
      date: "2026-11-27"
    })
    expect(parseStamp("2026-07-01 00:00:00 +0530")).toEqual({
      at: Date.UTC(2026, 5, 30, 18, 30),
      date: "2026-07-01"
    })
  })

  it("accepts ISO 8601 and rejects anything else", () => {
    expect(parseStamp("2026-11-27T08:31:12-08:00")?.at).toBe(Date.UTC(2026, 10, 27, 16, 31, 12))
    expect(parseStamp("2026-11-27T16:31:12Z")?.at).toBe(Date.UTC(2026, 10, 27, 16, 31, 12))
    expect(parseStamp("2026-11-27 08:31")).toBeNull()
    expect(parseStamp("yesterday")).toBeNull()
  })
})

describe("parseHealthExport", () => {
  it("reads weight readings and sums energy per day, ignoring other metrics", () => {
    expect(
      parseHealthExport({
        data: {
          metrics: [
            {
              name: "weight_body_mass",
              units: "kg",
              data: [
                { qty: 53.81, date: "2026-11-27 08:36:02 -0800", source: "Fitdays" },
                { qty: 53.9, date: "2026-11-27 08:31:12 -0800", source: "Fitdays" }
              ]
            },
            {
              name: "basal_energy_burned",
              units: "kcal",
              data: [{ qty: 1571.4, date: "2026-11-25 00:00:00 -0800", source: "Apple Watch" }]
            },
            {
              name: "active_energy",
              units: "kcal",
              data: [
                { qty: 400.2, date: "2026-11-25 00:00:00 -0800" },
                { qty: 300.1, date: "2026-11-25 12:00:00 -0800" },
                { qty: 650, date: "2026-11-26 00:00:00 -0800" }
              ]
            },
            {
              name: "heart_rate",
              units: "count/min",
              data: [{ Min: 60, Avg: 70, Max: 80, date: "2026-11-25 00:00:00 -0800" }]
            }
          ]
        }
      })
    ).toEqual({
      readings: [
        { at: Date.UTC(2026, 10, 27, 16, 31, 12), kg: 53.9 },
        { at: Date.UTC(2026, 10, 27, 16, 36, 2), kg: 53.81 }
      ],
      energy: [
        { date: "2026-11-25", resting: 1571.4, active: 700.3 },
        { date: "2026-11-26", resting: null, active: 650 }
      ]
    })
  })

  it("converts pounds and kilojoules", () => {
    const { readings, energy } = parseHealthExport({
      data: {
        metrics: [
          {
            name: "weight_body_mass",
            units: "lb",
            data: [{ qty: 121.2, date: "2026-11-27 08:31:00 -0800" }]
          },
          {
            name: "basal_energy_burned",
            units: "kJ",
            data: [{ qty: 4184, date: "2026-11-25 00:00:00 -0800" }]
          }
        ]
      }
    })
    expect(readings[0]?.kg).toBeCloseTo(54.975, 3)
    expect(energy[0]?.resting).toBeCloseTo(1000, 6)
  })

  it("treats a payload with no metrics as empty", () => {
    expect(parseHealthExport({ data: {} })).toEqual({ readings: [], energy: [] })
    expect(parseHealthExport({ data: { workouts: [] } })).toEqual({ readings: [], energy: [] })
  })

  it("rejects other shapes, unknown units and malformed points, saying where", () => {
    expect(() => parseHealthExport({ metrics: [] })).toThrow(PayloadError)
    expect(() =>
      parseHealthExport({
        data: { metrics: [{ name: "weight_body_mass", units: "st", data: [] }] }
      })
    ).toThrow('data.metrics.0 (weight_body_mass): unsupported units "st"')
    expect(() =>
      parseHealthExport({
        data: {
          metrics: [
            { name: "active_energy", units: "kcal", data: [{ qty: 1, date: "2026-11-25" }] }
          ]
        }
      })
    ).toThrow("data.metrics.0 (active_energy).data.0: expected")
  })
})
