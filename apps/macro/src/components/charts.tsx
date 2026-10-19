import { Link } from "@tanstack/react-router"
import { ROLLING_DAYS } from "../config"
import type { DayTotals, WeightPoint } from "../lib/nutrition"
import { dateMedium, dateShort, dayOfMonth, kg, weekdayInitial } from "../lib/format"
const pct = (value: number) => `${value}%`

/** Morning readings as dots, with their rolling average as a line, scaled by date. */
export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (!points.length) {
    return <p className="py-12 text-center text-sm text-muted">No morning weigh-ins yet.</p>
  }
  const values = points.flatMap((point) => [point.kg, point.average])
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const pad = Math.max((rawMax - rawMin) * 0.15, 0.3)
  const lo = rawMin - pad
  const hi = rawMax + pad
  const y = (value: number) => ((hi - value) / (hi - lo)) * 100
  const times = points.map((point) => Date.parse(`${point.date}T00:00:00Z`))
  const first = times[0]
  const span = times.at(-1)! - first
  const x = (i: number) => (span ? ((times[i] - first) / span) * 100 : 50)
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad]
  return (
    <div>
      <div className="flex gap-3">
        <div className="relative h-56 flex-1 sm:h-64">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ top: pct(y(tick)) }}
            />
          ))}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden="true"
          >
            <polyline
              points={points.map((point, i) => `${x(i)},${y(point.average)}`).join(" ")}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((point, i) => (
            <span
              key={point.date}
              title={`${dateMedium(point.date)} ${point.time}: ${kg(point.kg)} kg (${ROLLING_DAYS}-day avg ${kg(point.average)} kg)`}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/70"
              style={{ left: pct(x(i)), top: pct(y(point.kg)) }}
            />
          ))}
        </div>
        <div className="relative w-9 shrink-0 text-xs text-muted tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="absolute -translate-y-1/2" style={{ top: pct(y(tick)) }}>
              {kg(tick)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-between pr-12 text-xs text-muted">
        <span>{dateShort(points[0].date)}</span>
        <span>{dateShort(points.at(-1)!.date)}</span>
      </div>
    </div>
  )
}

/** One bar per calendar day against the goal; logged days link to their page. */
export function DailyBars({
  days,
  metric,
  goal,
  unit,
  format
}: {
  days: { date: string; totals: DayTotals | null }[]
  metric: "kcal" | "protein" | "fiber"
  goal: number
  unit: string
  format: (value: number) => string
}) {
  const values = days.map((day) => day.totals?.[metric] ?? 0)
  const max = Math.max(...values, goal * 1.15)
  const h = (value: number) => (value / max) * 100
  return (
    <div>
      <div className="relative h-36">
        <div
          className="absolute inset-x-0 z-10 border-t border-dashed border-muted"
          style={{ bottom: pct(h(goal)) }}
        >
          <span className="absolute right-0 bottom-1 rounded bg-surface px-1 text-[11px] text-muted">
            {format(goal)}
          </span>
        </div>
        <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5">
          {days.map(({ date, totals }, i) => {
            const value = values[i]
            const title = totals
              ? `${dateMedium(date)}: ${format(value)} ${unit}`
              : `${dateMedium(date)}: nothing logged`
            const bar = (
              <span
                className={`block w-full rounded-t-md ${value >= goal ? "bg-accent" : "bg-ink/80"}`}
                style={{ height: totals ? `max(${pct(h(value))}, 3px)` : 0 }}
              />
            )
            return totals ? (
              <Link
                key={date}
                to="/days/$date"
                params={{ date }}
                title={title}
                aria-label={title}
                className="flex h-full flex-1 items-end transition-opacity hover:opacity-70"
              >
                {bar}
              </Link>
            ) : (
              <span key={date} title={title} className="flex h-full flex-1 items-end">
                <span className="block h-[3px] w-full rounded-full bg-track" />
              </span>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-1 text-center text-[11px] leading-tight text-muted sm:gap-1.5">
        {days.map(({ date }) => (
          <span key={date} className="flex-1">
            <span className="block">{weekdayInitial(date)}</span>
            <span className="block tabular-nums">{dayOfMonth(date)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
