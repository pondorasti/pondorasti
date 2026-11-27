import { describe, expect, it } from "vite-plus/test"
import { appendLines, localTime, newEnergyDays, newWeighIns } from "./rows"

/** An instant from a Los Angeles wall-clock time in November (PST, UTC-8). */
const pst = (date: string, time: string) => Date.parse(`${date}T${time}:00-08:00`)
const LATER = pst("2026-11-28", "12:00")

describe("localTime", () => {
  it("reads Los Angeles wall-clock time across standard and daylight time", () => {
    expect(localTime(Date.UTC(2026, 10, 27, 16, 31, 59))).toEqual({
      date: "2026-11-27",
      time: "08:31"
    })
    expect(localTime(Date.UTC(2026, 6, 1, 15, 5))).toEqual({ date: "2026-07-01", time: "08:05" })
    expect(localTime(Date.UTC(2026, 10, 28, 7, 30))).toEqual({ date: "2026-11-27", time: "23:30" })
  })
})

describe("newWeighIns", () => {
  it("logs each day's first reading before noon, at the scale's time, to 2 decimals", () => {
    expect(
      newWeighIns(
        [],
        [
          { at: pst("2026-11-26", "08:54"), kg: 53.434 },
          { at: pst("2026-11-26", "21:10"), kg: 54.1 },
          { at: pst("2026-11-27", "09:30"), kg: 53.6 },
          { at: pst("2026-11-27", "10:45"), kg: 53.2 },
          { at: pst("2026-11-25", "13:00"), kg: 54 }
        ],
        LATER
      )
    ).toEqual({
      added: [
        { date: "2026-11-26", time: "08:54", kg: 53.43 },
        { date: "2026-11-27", time: "09:30", kg: 53.6 }
      ],
      skipped: []
    })
  })

  it("keeps the later of readings 5 minutes apart or less, chained", () => {
    const { added } = newWeighIns(
      [],
      [
        { at: pst("2026-11-27", "08:30"), kg: 53.9 },
        { at: pst("2026-11-27", "08:34"), kg: 53.7 },
        { at: pst("2026-11-27", "08:39"), kg: 53.75 },
        { at: pst("2026-11-27", "08:45"), kg: 53.5 }
      ],
      LATER
    )
    expect(added).toEqual([{ date: "2026-11-27", time: "08:39", kg: 53.75 }])
  })

  it("waits for a reading under 5 minutes old, in case a re-weigh follows", () => {
    const readings = [{ at: pst("2026-11-27", "08:30"), kg: 53.9 }]
    expect(newWeighIns([], readings, pst("2026-11-27", "08:33"))).toEqual({
      added: [],
      skipped: [
        { date: "2026-11-27", reason: "reading is under 5 minutes old; a re-weigh may follow" }
      ]
    })
    expect(newWeighIns([], readings, pst("2026-11-27", "08:35")).added).toHaveLength(1)
  })

  it("never adds a second morning row or repeats a logged reading", () => {
    const logged = [
      { date: "2026-11-25", time: "08:54", kg: 53.43 },
      { date: "2026-11-26", time: "12:04", kg: 54 },
      { date: "2026-11-27", time: "13:30", kg: 53.61 }
    ]
    expect(
      newWeighIns(
        logged,
        [
          { at: pst("2026-11-25", "10:30"), kg: 53 },
          { at: pst("2026-11-26", "11:55"), kg: 53.2 },
          { at: pst("2026-11-27", "08:40"), kg: 53.6 },
          { at: pst("2026-11-28", "08:40"), kg: 53.6 }
        ],
        pst("2026-11-29", "00:00")
      )
    ).toEqual({
      added: [{ date: "2026-11-28", time: "08:40", kg: 53.6 }],
      skipped: [
        { date: "2026-11-25", reason: "morning reading already logged" },
        { date: "2026-11-26", reason: "reading already logged" },
        { date: "2026-11-27", reason: "reading already logged" }
      ]
    })
  })
})

describe("newEnergyDays", () => {
  it("logs finished days, rounded, skipping logged, unfinished and still-syncing days", () => {
    expect(
      newEnergyDays(
        [{ date: "2026-11-20", resting: 1570, active: 716 }],
        [
          { date: "2026-11-20", resting: 1580, active: 800 },
          { date: "2026-11-21", resting: 1571.5, active: 699.4 },
          { date: "2026-11-22", resting: 1499.4, active: 300 },
          { date: "2026-11-23", resting: 1560, active: null },
          { date: "2026-11-24", resting: 1565, active: 0 },
          { date: "2026-11-27", resting: 900, active: 200 }
        ],
        "2026-11-27"
      )
    ).toEqual({
      added: [
        { date: "2026-11-21", resting: 1572, active: 699 },
        { date: "2026-11-24", resting: 1565, active: 0 }
      ],
      skipped: [
        { date: "2026-11-20", reason: "already logged" },
        { date: "2026-11-22", reason: "resting under 1500 kcal, still syncing" },
        { date: "2026-11-23", reason: "no active energy" },
        { date: "2026-11-27", reason: "day isn't over" }
      ]
    })
  })
})

describe("appendLines", () => {
  it("keeps existing text and ends with a newline", () => {
    expect(appendLines("date,time,kg\n1\n", ["2", "3"])).toBe("date,time,kg\n1\n2\n3\n")
    expect(appendLines("date,time,kg\n1", ["2"])).toBe("date,time,kg\n1\n2\n")
    expect(appendLines("date,time,kg\n", [])).toBe("date,time,kg\n")
  })
})
