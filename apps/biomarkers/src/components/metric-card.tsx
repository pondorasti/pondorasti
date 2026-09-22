import { Link } from "@tanstack/react-router"
import { CATS } from "~/data"
import { classify, fmt, fmtDate, sourceName, statusText, type Metric } from "~/metrics"
import { MiniRange, Spark } from "./charts"
import { CatIcon, catStyle, Tag } from "./ui"

export function MetricCard({ m }: { m: Metric }) {
  const cls = classify(m)
  const meta = [`${fmtDate(m.latest.d)} · ${sourceName(m.latest.s)}`]
  if (!m.qual)
    meta.push(
      m.records.length >= 2
        ? `${m.records.length} records`
        : `Range ${fmt(m.lo)}–${fmt(m.hi)} ${m.u}`
    )
  const negative = m.qual && /negative|not detected|non-reactive|<\s*\d/i.test(m.cur)
  return (
    <Link
      to="/m/$id"
      params={{ id: m.id }}
      style={catStyle(m.cat)}
      className="surface relative flex min-h-37 flex-col p-3.5 transition-[transform,box-shadow] duration-100 hover:shadow-card-hover active:scale-[0.985]"
    >
      <div className="flex items-center gap-2 text-xs leading-none font-semibold tracking-[0.04em] text-(--cat) uppercase">
        <CatIcon cat={m.cat} className="size-5.5 rounded-md text-[11px]" />
        {CATS[m.cat].name}
      </div>
      <Tag
        tone={m.qual ? (negative ? "in" : "neutral") : cls}
        className="absolute top-3.5 right-3.5"
      >
        {m.qual ? (negative ? "Negative" : "Result") : statusText(cls)}
      </Tag>
      <div className="mt-2 font-display text-base leading-[1.2] font-semibold tracking-[-0.01em]">
        {m.n}
      </div>
      <div className="mt-0.75 text-xs leading-[1.3] text-ink-3">{meta.join(" · ")}</div>
      {m.qual ? (
        <div className="mt-auto pt-3 font-display text-[22px] leading-[1.15] font-bold tracking-[-0.01em]">
          {m.cur}
        </div>
      ) : (
        <>
          <div className="mt-auto flex items-baseline gap-1.5 pt-3 font-display text-[30px] leading-[1.05] font-bold tracking-[-0.02em]">
            {fmt(m.cur)}
            {m.u && <small className="font-sans text-sm font-medium text-ink-3">{m.u}</small>}
          </div>
          {m.records.length >= 2 ? <Spark m={m} /> : <MiniRange m={m} cls={cls} />}
        </>
      )}
    </Link>
  )
}
