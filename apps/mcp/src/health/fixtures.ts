/** A trimmed Health Auto Export v2 push: daily-summarized metrics plus one workout. */
export const exportBody = {
  data: {
    metrics: [
      {
        name: "active_energy",
        units: "kJ",
        data: [
          { date: "2026-10-12 00:00:00 +0300", qty: 2510.4, source: "Alexandru’s Apple Watch" },
          { date: "2026-10-13 00:00:00 +0300", qty: 1255.2, source: "Alexandru’s Apple Watch" }
        ]
      },
      {
        name: "basal_energy_burned",
        units: "kcal",
        data: [{ date: "2026-10-12 00:00:00 +0300", qty: 1750.4 }]
      },
      {
        name: "step_count",
        units: "count",
        data: [{ date: "2026-10-12 00:00:00 +0300", qty: 9876, source: "iPhone|Apple Watch" }]
      },
      {
        name: "heart_rate",
        units: "count/min",
        data: [{ date: "2026-10-12 00:00:00 +0300", Min: 48, Avg: 71.4, Max: 162 }]
      },
      {
        name: "resting_heart_rate",
        units: "count/min",
        data: [{ date: "2026-10-12 00:00:00 +0300", qty: 52 }]
      },
      {
        name: "weight_body_mass",
        units: "lb",
        data: [{ date: "2026-10-12 07:31:00 +0300", qty: 176.37, source: "Withings" }]
      },
      {
        name: "sleep_analysis",
        units: "hr",
        data: [
          {
            date: "2026-10-12 00:00:00 +0300",
            totalSleep: 7.25,
            asleep: 0,
            core: 3.9,
            deep: 1.1,
            rem: 2.25,
            awake: 0.3,
            inBed: 0,
            sleepStart: "2026-10-11 23:40:00 +0300",
            sleepEnd: "2026-10-12 07:15:00 +0300",
            inBedStart: "2026-10-11 23:30:00 +0300",
            inBedEnd: "2026-10-12 07:20:00 +0300",
            source: "Alexandru’s Apple Watch"
          }
        ]
      }
    ],
    workouts: [
      {
        id: "9F1C2B44-3D2A-4E1B-8C55-0A7E6D2B9F10",
        name: "Traditional Strength Training",
        start: "2026-10-12 18:00:00 +0300",
        end: "2026-10-12 19:05:00 +0300",
        duration: 3900,
        location: "Indoor",
        isIndoor: true,
        activeEnergyBurned: { qty: 1464.4, units: "kJ" },
        totalEnergy: { qty: 520, units: "kcal" },
        intensity: { qty: 5.1, units: "kcal/hr·kg" },
        heartRate: {
          min: { qty: 88, units: "bpm" },
          avg: { qty: 121.6, units: "bpm" },
          max: { qty: 158, units: "bpm" }
        },
        heartRateData: [
          { date: "2026-10-12 18:00:00 +0300", Min: 88, Avg: 95, Max: 101, units: "bpm" }
        ],
        route: []
      }
    ]
  }
}
