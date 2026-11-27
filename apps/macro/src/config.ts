/** Daily targets: below one is short, at or above it is on target. */
export const TARGETS = {
  kcal: 2500,
  protein: 110,
  fiber: 20
} as const

/** Morning-weight goals: the trend weight to reach, in kilograms, and the date it's due. */
export const GOALS = [
  { label: "125 lb", kg: 56.7, by: "2026-12-31" },
  { label: "145 lb", kg: 65.77, by: "2027-12-31" }
] as const

/** Calendar days of food, energy and weigh-ins behind the gain-rate and maintenance estimates. */
export const ESTIMATE_DAYS = 28

/** Energy in one kilogram of body-weight change, for turning gain into kilocalories. */
export const KCAL_PER_KG = 7700

/** Goals due within this many days of the last weigh-in are projected on the weight chart. */
export const PROJECT_DAYS = 120

/** Every `date` and `time` in `content/` is wall-clock time here. */
export const TIME_ZONE = "America/Los_Angeles"

/** Weigh-ins logged before this local time (HH:MM) are morning readings, the ones trended. */
export const MORNING_BEFORE = "12:00"

/** Scale readings this many minutes apart or less are a re-weigh: the later one counts. */
export const REWEIGH_MINUTES = 5

/** A synced reading this close to a logged one on the same day is the same reading. */
export const DUPLICATE_MINUTES = 10

/** A synced day with less resting energy than this hasn't finished syncing from the watch. */
export const MIN_RESTING_KCAL = 1500

/** Days of morning readings averaged into each point of the weight trend. */
export const ROLLING_DAYS = 7

/** Calendar days of morning weights charted on the dashboard. */
export const WEIGHT_DAYS = 90

/** Calendar days shown in the dashboard's recent totals. */
export const RECENT_DAYS = 14

/** Weeks shown in the dashboard's weekly averages. */
export const RECENT_WEEKS = 6
