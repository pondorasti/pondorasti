import type { ReactNode } from "react"

export type Goal = number | { min: number; max: number }

const pct = (value: number) => `${Math.max(0, Math.min(100, value))}%`
export const goalMin = (goal: Goal) => (typeof goal === "number" ? goal : goal.min)
const goalMax = (goal: Goal) => (typeof goal === "number" ? goal : goal.max)
export const goalText = (goal: Goal, format: (value: number) => string) =>
  typeof goal === "number" ? format(goal) : `${format(goal.min)}–${format(goal.max)}`

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
  goal: Goal
  unit: string
  format: (value: number) => string
  note?: ReactNode
}) {
  const scale = Math.max(goalMax(goal) * 1.2, value)
  const reached = value >= goalMin(goal)
  const percent = Math.round((value / goalMin(goal)) * 100)
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
          / {goalText(goal, format)} {unit}
        </span>
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goalMax(goal)}
        aria-valuenow={value}
        className="relative mt-4 h-2.5 rounded-full bg-track"
      >
        {typeof goal !== "number" && (
          <div
            className="absolute inset-y-0 rounded-full bg-accent/20"
            style={{
              left: pct((goal.min / scale) * 100),
              width: pct(((goal.max - goal.min) / scale) * 100)
            }}
          />
        )}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${reached ? "bg-accent" : "bg-ink"}`}
          style={{ width: pct((value / scale) * 100) }}
        />
        <div
          className="absolute -inset-y-1 w-0.5 rounded-full bg-muted"
          style={{ left: `calc(${pct((goalMin(goal) / scale) * 100)} - 1px)` }}
          aria-hidden="true"
        />
      </div>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </div>
  )
}
