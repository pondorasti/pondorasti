import { classifyVal, fmt, fmtDate, fmtDateShort, sourceName, type Metric } from "~/metrics"
import { RangeBar } from "./charts"
import { catStyle } from "./ui"

/** One measurement, grouped under its date (Apple Health style). */
export function RecordCard({ m, index }: { m: Metric; index: number }) {
  const { d, s } = m.records[index]
  const source = sourceName(s)
  const date = fmtDate(d)
  return (
    <div className="mt-5.5 first:mt-0">
      <div className="px-1 font-display text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">
        {date}
      </div>
      <div className="mt-1.5 mb-3 px-1 text-sm leading-none font-medium text-ink-3">{source}</div>
      <div style={catStyle(m.cat)} className="surface relative block px-4.5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-[13px] leading-none font-bold tracking-[0.06em] text-(--cat) uppercase">
            <span className="relative inline-block size-4 shrink-0 rounded bg-(--cat) after:absolute after:inset-y-0.75 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-[1px] after:bg-white/85" />
            {m.n}
          </div>
          <div className="text-sm leading-none font-medium text-ink-3">{fmtDateShort(d)}</div>
        </div>
        <Value m={m} index={index} />
        <div className="mt-3.5 border-t border-sep pt-3 text-[13px] leading-none font-medium text-ink-3">
          Collected · {date} · {source}
        </div>
      </div>
    </div>
  )
}

function Value({ m, index }: { m: Metric; index: number }) {
  if (m.qual)
    return (
      <div className="mt-3.5 font-display text-2xl leading-none font-bold tracking-[-0.01em]">
        {m.records[index].v}
      </div>
    )
  const r = m.records[index]
  return (
    <>
      <div className="mt-3.5 flex items-baseline gap-1.5 font-display text-4xl leading-none font-bold tracking-[-0.025em]">
        {fmt(r.v)}
        <small className="font-sans text-base font-medium text-ink-3">{r.u}</small>
      </div>
      <RangeBar v={r.v} lo={r.lo} hi={r.hi} cls={classifyVal(r.v, r.lo, r.hi, m.fd)} />
    </>
  )
}
