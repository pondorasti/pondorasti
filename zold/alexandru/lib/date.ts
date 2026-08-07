export function normalizeUtc(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000)
}

export function formatDate(date: Date, showYear = true): string {
  const getOrdinalNum = (n: number) =>
    n + (n > 0 ? ["th", "st", "nd", "rd"][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : "")

  const day = getOrdinalNum(date.getDate())
  const month = date.toLocaleDateString("en-us", { month: "long" })
  const year = date.toLocaleDateString("en-us", { year: "numeric" })

  let result = `${month} ${day}`
  if (showYear) {
    result += ` ${year}`
  }
  return result
}
