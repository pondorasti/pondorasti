import type { ReactNode } from "react"

const pct = (value: number) => `${Math.max(0, Math.min(100, value))}%`

/** A day's value against its goal; the track runs past the goal so overshoot stays visible. */
export function TargetBar({
  label,
  value,
  goal,
  unit,
  format,
  note
}: {
  label: string
  value: number
  goal: number
  unit: string
  format: (value: number) => string
  note?: ReactNode
}) {
  const scale = Math.max(goal * 1.2, value)
  const reached = value >= goal
  const percent = Math.round((value / goal) * 100)
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <p
          className={`text-sm tabular-nums ${reached ? "text-accent" : "text-muted"}`}
          aria-label={`${percent}% of target`}
        >
          {percent}%
        </p>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <span className="figure">{format(value)}</span>
        <span className="text-sm text-muted">
          / {format(goal)} {unit}
        </span>
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
        className="relative mt-4 h-2.5 rounded-full bg-track"
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${reached ? "bg-accent" : "bg-ink"}`}
          style={{ width: pct((value / scale) * 100) }}
        />
        <div
          className="absolute -inset-y-1 w-0.5 rounded-full bg-muted"
          style={{ left: `calc(${pct((goal / scale) * 100)} - 1px)` }}
          aria-hidden="true"
        />
      </div>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </div>
  )
}
