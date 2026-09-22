import { CATS, M, PDFS, REC, SOURCES, type CategoryId, type SourceId } from "./data"

export interface QuantReading {
  v: number
  d: string
  s: SourceId
  lo: number
  hi: number
  u: string
}
export interface QualReading {
  v: string
  d: string
  s: SourceId
}
interface Base {
  id: string
  n: string
  cat: CategoryId
  fd?: "good-floor"
  date: string
}
export interface QuantMetric extends Base {
  qual: false
  records: QuantReading[]
  latest: QuantReading
  cur: number
  prev: number | null
  lo: number
  hi: number
  u: string
}
export interface QualMetric extends Base {
  qual: true
  records: QualReading[]
  latest: QualReading
  cur: string
}
export type Metric = QuantMetric | QualMetric
export type Status = "in" | "lo" | "hi"

/* ============ BUILD METRICS ============ */
export const metrics: Record<string, Metric> = {}
for (const [id, raw] of Object.entries(REC)) {
  const def = M[id]
  if (!def) continue
  const rows = [...raw].sort((a, b) => b[1].localeCompare(a[1])) // newest first
  const base = { id, n: def.n, cat: def.cat, fd: def.fd, date: rows[0][1] }
  if (typeof rows[0][0] === "string") {
    const records = rows.map(([v, d, s]) => ({ v: String(v), d, s }))
    metrics[id] = { ...base, qual: true, records, latest: records[0], cur: records[0].v }
  } else {
    const records = rows.map((row) => {
      const [v, d, s, lo, hi, u] = row as [number, string, SourceId, number, number, string]
      return { v, d, s, lo, hi, u }
    })
    const latest = records[0]
    metrics[id] = {
      ...base,
      qual: false,
      records,
      latest,
      cur: latest.v,
      prev: records[1]?.v ?? null,
      lo: latest.lo,
      hi: latest.hi,
      u: latest.u
    }
  }
}
const all = Object.values(metrics)

/* ============ HELPERS ============ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export function fmtDate(d: string) {
  const [y, m, dd] = d.split("-").map(Number)
  return `${MONTHS[m - 1]} ${dd}, ${y}`
}
export function fmtDateShort(d: string) {
  const [, m, dd] = d.split("-").map(Number)
  return `${MONTHS[m - 1]} ${dd}`
}
export function classifyVal(v: number, lo: number, hi: number, fd?: "good-floor"): Status {
  if (fd === "good-floor") return v >= lo ? "in" : "lo"
  if (v < lo) return "lo"
  if (v > hi) return "hi"
  return "in"
}
export const classify = (m: Metric): Status =>
  m.qual ? "in" : classifyVal(m.cur, m.lo, m.hi, m.fd)
export function fmt(n: number | string | null | undefined) {
  if (typeof n !== "number") return n == null ? "—" : n
  if (Number.isInteger(n)) return n.toString()
  return (+n.toPrecision(6)).toString()
}
export const statusText = (cls: Status) =>
  cls === "in" ? "In Range" : cls === "lo" ? "Below Range" : "Above Range"
export const isNegative = (value: string) => /negative|not detected|non-reactive/i.test(value)
export const sourceName = (s: SourceId) => SOURCES[s]?.label ?? s
/** Status color: in range is good, anything else is a warning. */
export const statusColor = (cls: Status) => (cls === "in" ? "var(--good)" : "var(--warn)")

/* ============ SUMMARY ============ */
export const favorites = ["alt", "homocysteine", "ferritin", "vit_d"]
  .map((id) => metrics[id])
  .filter(Boolean)

// Out of range: the latest reading is outside its reference.
export const flagged = all
  .filter((m) => !m.qual && classify(m) !== "in")
  .sort((a, b) => b.latest.d.localeCompare(a.latest.d))

// Most recent panel: every metric measured on the newest date.
const RECENT_ORDER: CategoryId[] = [
  "heart",
  "liver",
  "kidney",
  "blood",
  "metab",
  "vit",
  "hormone",
  "omega",
  "gut",
  "immune",
  "infect",
  "cancer"
]
export const latestDate = all
  .map((m) => m.latest.d)
  .sort()
  .at(-1)!
export const recent = all
  .filter((m) => m.latest.d === latestDate)
  .sort((a, b) => RECENT_ORDER.indexOf(a.cat) - RECENT_ORDER.indexOf(b.cat))
export const recentSource = recent.length
  ? sourceName(recent[0].latest.s).replace(/\s+(Health|Diagnostics|Permanente)$/, "")
  : ""

export const stats = {
  records: all.reduce((sum, m) => sum + m.records.length, 0),
  metrics: all.length,
  sources: new Set(all.flatMap((m) => m.records.map((r) => r.s))).size
}

export interface Highlight {
  cat: CategoryId
  title: string
  body: (string | { b: string })[]
}
export const highlights: Highlight[] = []
{
  const { alt, homocysteine: hom, ferritin: fer, vit_d: vd } = metrics
  if (alt && !alt.qual && alt.records.length >= 2) {
    const [r0, r1] = alt.records
    const dropped = r1.v - r0.v
    if (Math.abs(dropped) > 5)
      highlights.push({
        cat: "liver",
        title: "ALT trend",
        body: [
          "Latest reading ",
          { b: `${fmt(r0.v)} ${r0.u}` },
          ` on ${fmtDate(r0.d)} — ${dropped > 0 ? "down" : "up"} `,
          { b: `${fmt(Math.abs(dropped))}` },
          ` from ${fmt(r1.v)}.`
        ]
      })
  }
  if (hom && !hom.qual && hom.records.length >= 2)
    highlights.push({
      cat: "vit",
      title: "Homocysteine",
      body: [
        "Latest: ",
        { b: `${fmt(hom.cur)} ${hom.u}` },
        ` on ${fmtDate(hom.latest.d)}. Was `,
        { b: `${fmt(hom.prev)}` },
        ` in ${fmtDate(hom.records[1].d).split(",")[0]}.`
      ]
    })
  if (fer && !fer.qual && classify(fer) !== "in")
    highlights.push({
      cat: "blood",
      title: "Iron stores",
      body: [
        "Ferritin is ",
        { b: `${fmt(fer.cur)} ${fer.u}` },
        ` — below the ${fmt(fer.lo)} floor as of ${fmtDate(fer.latest.d)}.`
      ]
    })
  if (vd && !vd.qual && classify(vd) !== "in")
    highlights.push({
      cat: "vit",
      title: "Vitamin D",
      body: [
        { b: `${fmt(vd.cur)} ${vd.u}` },
        ` — below optimal (≥${fmt(vd.lo)}) on ${fmtDate(vd.latest.d)}.`
      ]
    })
}

/* ============ BROWSE ============ */
export const categories = (Object.keys(CATS) as CategoryId[])
  .map((key) => {
    const items = all.filter((m) => m.cat === key).sort((a, b) => a.n.localeCompare(b.n))
    return {
      key,
      ...CATS[key],
      items,
      flagged: items.filter((m) => !m.qual && classify(m) !== "in").length
    }
  })
  .filter((c) => c.items.length > 0)

/* ============ REPORTS ============ */
export interface Report {
  src: SourceId
  date: string
  pdf: string
  title: string
  sourceName: string
}
const reportOf = (key: string): Report => {
  const [pdf, label] = PDFS[key]
  const [src, date] = key.split("|") as [SourceId, string]
  return { src, date, pdf, title: label.replace(/^.*?·\s*/, ""), sourceName: sourceName(src) }
}
export const reports = Object.keys(PDFS)
  .map(reportOf)
  .sort((a, b) => b.date.localeCompare(a.date))
export const reportsByYear = Object.entries(
  Object.groupBy(reports, (r) => r.date.slice(0, 4)) as Record<string, Report[]>
).sort(([a], [b]) => b.localeCompare(a))

/** The source reports behind a metric's readings (at most six). */
export const metricReports = (m: Metric) =>
  [...new Set(m.records.map((r) => `${r.s}|${r.d}`))]
    .filter((key) => PDFS[key])
    .slice(0, 6)
    .map(reportOf)
