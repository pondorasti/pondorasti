/** Daily targets. Fiber is a range: below `min` is short, within it is on target. */
export const TARGETS = {
  kcal: 2850,
  protein: 110,
  fiber: { min: 25, max: 30 }
} as const

/** Every `date` and `time` in `content/` is wall-clock time here. */
export const TIME_ZONE = "America/Los_Angeles"

/** Weigh-ins logged before this local time (HH:MM) are morning readings, the ones trended. */
export const MORNING_BEFORE = "12:00"

/** Days of morning readings averaged into each point of the weight trend. */
export const ROLLING_DAYS = 7

/** Calendar days of morning weights charted on the dashboard. */
export const WEIGHT_DAYS = 90

/** Calendar days shown in the dashboard's recent totals. */
export const RECENT_DAYS = 14

/** Weeks shown in the dashboard's weekly averages. */
export const RECENT_WEEKS = 6
