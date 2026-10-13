import { fromIso } from "./nutrition"

const formatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })

const long = formatter({ weekday: "long", month: "long", day: "numeric", year: "numeric" })
const medium = formatter({ weekday: "short", month: "short", day: "numeric" })
const short = formatter({ month: "short", day: "numeric" })
const weekday = formatter({ weekday: "narrow" })

// Dates are calendar days with no time zone of their own, so they're formatted as UTC.
export const dateLong = (date: string) => long.format(fromIso(date))
export const dateMedium = (date: string) => medium.format(fromIso(date))
export const dateShort = (date: string) => short.format(fromIso(date))
export const weekdayInitial = (date: string) => weekday.format(fromIso(date))
export const dayOfMonth = (date: string) => String(Number(date.slice(8)))

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })
const kgFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2
})

export const kcal = (value: number) => integer.format(value)
export const grams = (value: number) => decimal.format(value)
export const kg = (value: number) => kgFormat.format(value)

export const label = (id: string) => id[0].toUpperCase() + id.slice(1).replaceAll("-", " ")
