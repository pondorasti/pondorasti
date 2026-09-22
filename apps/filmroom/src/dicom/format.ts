export function formatDate(date: string) {
  return new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8))
  ).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}
