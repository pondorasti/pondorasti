import {
  classifyVal,
  fmt,
  fmtDate,
  fmtDateShort,
  statusColor,
  statusText,
  type QuantMetric,
  type Status
} from "~/metrics"
import { cx } from "./ui"

const pct = (n: number) => `${n}%`

/** Mini sparkline for metric cards. Left is oldest, right is newest. */
export function Spark({ m }: { m: QuantMetric }) {
  const rs = [...m.records].reverse()
  const vals = rs.map((r) => r.v)
  const minV = Math.min(...vals, m.lo)
  const maxV = Math.max(...vals, m.hi)
  const span = maxV - minV || 1
  const y = (v: number) => (100 * (maxV - v)) / span
  const color = statusColor(classifyVal(rs.at(-1)!.v, m.lo, m.hi, m.fd))
  const n = rs.length
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  return (
    <div className="relative mt-2.5 h-9">
      <Band top={y(m.hi)} bottom={y(m.lo)} className="rounded-[3px] bg-good/14" />
      <Line points={rs.map((r, i) => `${x(i)},${y(r.v)}`)} color={color} width={2} />
      {rs.map((r, i) => (
        <span
          key={i}
          className="absolute z-2 size-2.25 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--card)]"
          style={{
            left: i === 0 ? "1px" : i === n - 1 ? "calc(100% - 1px)" : pct(x(i)),
            top: pct(y(r.v)),
            background: i === n - 1 ? color : "var(--ink-3)"
          }}
        />
      ))}
    </div>
  )
}

/** Reference bar for single-measurement cards. */
export function MiniRange({ m, cls }: { m: QuantMetric; cls: Status }) {
  const span = m.hi - m.lo || 1
  const a = m.lo - span * 0.25
  const b = m.hi + span * 0.25
  const p = Math.max(2, Math.min(98, ((m.cur - a) / (b - a)) * 100))
  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-card-2">
        <div
          className="absolute inset-y-0 rounded-full bg-good/85"
          style={{
            left: pct(((m.lo - a) / (b - a)) * 100),
            width: pct(((m.hi - m.lo) / (b - a)) * 100)
          }}
        />
        <div
          className="absolute -top-1 h-3.5 w-0.75 rounded-[2px] shadow-[0_0_0_2px_var(--card)]"
          style={{ left: `calc(${p}% - 1.5px)`, background: statusColor(cls) }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] leading-none font-medium text-ink-3">
        <span>{fmt(m.lo)}</span>
        <span>{fmt(m.hi)}</span>
      </div>
    </div>
  )
}

/** Time-scaled trend of every measurement, for the detail page. */
export function TrendChart({ m, color }: { m: QuantMetric; color: string }) {
  const rs = [...m.records].reverse()
  const n = rs.length
  const vals = rs.map((r) => r.v)
  const rawMin = Math.min(...vals, m.lo)
  const rawMax = Math.max(...vals, m.hi)
  const pad = (rawMax - rawMin || 1) * 0.2
  const minV = rawMin - pad
  const maxV = rawMax + pad
  const y = (v: number) => (100 * (maxV - v)) / (maxV - minV || 1)
  const ts = rs.map((r) => Date.parse(r.d))
  const tMin = Math.min(...ts),
    tMax = Math.max(...ts)
  const x = (i: number) =>
    tMax === tMin ? (n === 1 ? 50 : (i / (n - 1)) * 100) : ((ts[i] - tMin) / (tMax - tMin)) * 100
  const first = rs[0],
    last = rs[n - 1]
  return (
    <Card>
      <div className="eyebrow">
        {fmtDate(first.d)} → {fmtDate(last.d)} · {n} measurements
      </div>
      <div className="mt-1.5 font-display text-[22px] leading-[1.2] font-bold tracking-[-0.01em]">
        {fmt(first.v)} → <span style={{ color }}>{fmt(last.v)}</span> {m.u}
      </div>
      <div className="mt-4.5">
        <div className="relative h-35">
          <Band top={y(m.hi)} bottom={y(m.lo)} className="rounded-sm bg-good/12" />
          <Line points={rs.map((r, i) => `${x(i)},${y(r.v)}`)} color={color} width={2.5} />
          {rs.map((r, i) => {
            const current = i === n - 1
            const dot = current
              ? color
              : classifyVal(r.v, m.lo, m.hi, m.fd) === "in"
                ? "var(--ink-3)"
                : "var(--warn)"
            return (
              <span
                key={i}
                className="absolute z-2 size-3.25 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_var(--card)]"
                style={{ left: pct(x(i)), top: pct(y(r.v)), background: dot }}
              >
                <span
                  className="absolute bottom-4.5 left-1/2 -translate-x-1/2 font-display text-[13px] leading-none font-bold tracking-[-0.01em] whitespace-nowrap text-ink-2"
                  style={current ? { color: dot } : undefined}
                >
                  {fmt(r.v)}
                </span>
              </span>
            )
          })}
        </div>
        <div className="mt-3.5 flex justify-between px-1 text-xs leading-none font-medium text-ink-3">
          <span>{fmtDateShort(first.d)}</span>
          <span>{fmtDateShort(last.d)}</span>
        </div>
      </div>
    </Card>
  )
}

/** Below / in / above bar with a pin, as in Apple Health records. */
export function RangeBar({
  v,
  lo,
  hi,
  cls,
  unit = "",
  hero = false
}: {
  v: number
  lo: number
  hi: number
  cls: Status
  unit?: string
  hero?: boolean
}) {
  const b1 = 33,
    b2 = 67
  let pin: number, mid: number
  if (cls === "in") {
    pin = b1 + ((v - lo) / Math.max(0.0001, hi - lo)) * (b2 - b1)
    mid = (b1 + b2) / 2
  } else if (cls === "lo") {
    pin = Math.max(0, Math.min(1, v / Math.max(0.0001, lo))) * b1
    mid = b1 / 2
  } else {
    pin = b2 + Math.max(0, Math.min(1, (v - hi) / Math.max(0.0001, hi))) * (100 - b2)
    mid = (b2 + 100) / 2
  }
  const on = cls === "in" ? "bg-good" : "bg-warn"
  return (
    <div className={hero ? "mt-5.5" : "mt-3.5"}>
      <div className={cx("relative", hero ? "mb-2.5 h-3.25" : "mb-2 h-2.75")}>
        <span
          className={cx(
            "absolute top-0 -translate-x-1/2 leading-none font-bold tracking-[0.08em] whitespace-nowrap uppercase",
            hero ? "text-xs" : "text-[11px]",
            cls === "in" ? "text-good" : "text-warn"
          )}
          style={{ left: pct(mid) }}
        >
          {statusText(cls)}
        </span>
      </div>
      <div className={cx("relative flex", hero ? "h-2.5 gap-1.25" : "h-2 gap-1")}>
        {(["lo", "in", "hi"] as const).map((segment) => (
          <div
            key={segment}
            className={cx(
              "flex-1 rounded-full",
              segment === cls ? on : "bg-[rgba(120,120,128,0.3)]"
            )}
          />
        ))}
        <div
          className={cx(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white",
            hero
              ? "size-3.5 shadow-[0_0_0_2px_var(--card)]"
              : "size-3 shadow-[0_0_0_1.5px_var(--card)]"
          )}
          style={{ left: pct(pin) }}
        />
      </div>
      <div
        className={cx(
          "relative leading-none font-medium text-ink-3",
          hero ? "mt-2.5 h-4 text-[13px]" : "mt-2 h-3.5 text-xs"
        )}
      >
        <span className="absolute -translate-x-1/2" style={{ left: pct(b1) }}>
          {fmt(lo)}
          {unit && ` ${unit}`}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(b2) }}>
          {fmt(hi)}
          {unit && ` ${unit}`}
        </span>
      </div>
    </div>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="surface px-5.5 pt-5.5 pb-4.5">{children}</div>
}

function Band({ top, bottom, className }: { top: number; bottom: number; className: string }) {
  return (
    <div
      className={cx("absolute inset-x-0 min-h-0.5", className)}
      style={{ top: pct(top), height: pct(Math.max(2, bottom - top)) }}
    />
  )
}

function Line({ points, color, width }: { points: string[]; color: string; width: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
