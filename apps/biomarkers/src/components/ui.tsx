import type { CSSProperties, ReactNode } from "react"
import { CATS, type CategoryId } from "~/data"
import type { Status } from "~/metrics"

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ")

/** Exposes a category's color as `--cat` for `bg-(--cat)` / `text-(--cat)`. */
export const catStyle = (cat: CategoryId) => ({ "--cat": `var(--${cat})` }) as CSSProperties

export function CatIcon({ cat, className }: { cat: CategoryId; className: string }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center bg-(--cat) font-bold text-white",
        className
      )}
    >
      {CATS[cat].letter}
    </span>
  )
}

const tones = {
  in: "bg-good/14 text-[#1e7a3a] dark:text-[#7ee2a0]",
  lo: "bg-warn/14 text-[#a85b00] dark:text-[#ffb965]",
  hi: "bg-bad/14 text-[#a82016] dark:text-[#ff8b85]",
  neutral: "bg-card-2 text-ink-2"
}

export function Tag({
  tone,
  className,
  children
}: {
  tone: Status | "neutral"
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-1.25 text-[11px] leading-none font-semibold whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function Chip({ tone, children }: { tone: "good" | "warn" | "bad"; children: ReactNode }) {
  const color = {
    good: tones.in,
    warn: tones.lo,
    bad: "bg-bad/12 text-[#a82016] dark:text-[#ff8b85]"
  }[tone]
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] leading-none font-medium",
        color
      )}
    >
      {children}
    </span>
  )
}

export function Section({ title, meta }: { title: string; meta?: string }) {
  return (
    <h2 className="mt-6 mb-2.5 flex items-baseline justify-between gap-2 font-display text-[22px] leading-[1.1] font-bold tracking-[-0.02em]">
      {title}
      {meta && (
        <span className="font-sans text-[13px] font-medium tracking-normal text-ink-3">{meta}</span>
      )}
    </h2>
  )
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="eyebrow mx-1 mt-6.5 mb-2.5">{children}</h3>
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid gap-3 min-[521px]:grid-cols-2", className)}>{children}</div>
}

export const Chevron = () => <span className="shrink-0 text-lg text-ink-4">›</span>
