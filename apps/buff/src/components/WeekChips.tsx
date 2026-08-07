import { Link } from '@tanstack/react-router'
import { week, getDayBySlug } from '~/data'

/** Weekday chips: Mon Push · Tue Pull · … Rest days are dimmed.
    Pass `activeSlug` (Routine page) to highlight the selected day;
    `showFocus` adds the muscle-focus sub-label (CHEST·SHLDR·TRI). */
export function WeekChips({ activeSlug, showFocus = false }: { activeSlug?: string; showFocus?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {week.map((w) => {
        if (!w.slug) {
          return (
            <div
              key={w.d}
              className="rounded-[10px] border border-line bg-panel px-[13px] py-[9px] text-[13px] text-muted opacity-60"
            >
              <b className="text-txt">{w.d}</b> Rest
            </div>
          )
        }
        const active = w.slug === activeSlug
        const focus = showFocus ? getDayBySlug(w.slug)?.focus : undefined
        return (
          <Link
            key={w.d}
            to="/routine/$day"
            params={{ day: w.slug }}
            className={
              'flex flex-col gap-px rounded-[10px] border px-[13px] py-[9px] text-[13px] ' +
              (active ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-panel text-muted hover:border-dim')
            }
          >
            <span>
              <b className={active ? 'text-accent-fg' : 'text-txt'}>{w.d}</b>{' '}
              <span className={'font-bold ' + (active ? 'text-accent-fg' : 'text-accent')}>{w.name}</span>
            </span>
            {focus ? (
              <small
                className={'text-[10px] font-semibold tracking-[0.03em] ' + (active ? 'opacity-60' : 'text-dim')}
              >
                {focus}
              </small>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
