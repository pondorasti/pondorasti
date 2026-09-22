import { Button } from "@base-ui/react/button"
import { createFileRoute, notFound, useCanGoBack, useRouter } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { Card, RangeBar, TrendChart } from "~/components/charts"
import { RecordCard } from "~/components/record-card"
import { CatIcon, catStyle, Chevron, cx, SubHeading, Tag } from "~/components/ui"
import { CATS } from "~/data"
import {
  classify,
  fmt,
  fmtDate,
  isNegative,
  metricReports,
  metrics,
  sourceName,
  statusColor,
  statusText,
  type Metric
} from "~/metrics"

export const Route = createFileRoute("/m/$id")({
  loader: ({ params }) => {
    const m = metrics[params.id]
    if (!m) throw notFound()
    return { id: m.id, name: m.n }
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} · Health` }] : []
  }),
  component: Detail
})

function Detail() {
  const m = metrics[Route.useLoaderData().id]
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const cls = classify(m)
  const status = m.qual ? (isNegative(m.cur) ? "Negative" : "Result") : statusText(cls)
  const color = statusColor(cls)
  const reference = m.qual
    ? "Qualitative"
    : m.fd === "good-floor"
      ? `≥ ${fmt(m.lo)} ${m.u}`
      : `${fmt(m.lo)} – ${fmt(m.hi)} ${m.u}`
  const sources = [...new Set(m.records.map((r) => sourceName(r.s)))].join(", ")
  const reports = metricReports(m)

  return (
    <div className="pt-2">
      <Button
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: "/" }))}
        className="inline-flex cursor-pointer items-center gap-0.5 pt-3.5 pb-3 text-[17px] leading-[1.2] font-medium tracking-[-0.005em] text-link active:opacity-60"
      >
        <ChevronLeft size={22} strokeWidth={2.5} className="-ml-1.5" />
        Back
      </Button>

      <div style={catStyle(m.cat)} className="surface relative mt-1.5 p-5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-2.5 text-[13px] leading-none font-semibold tracking-[0.04em] text-(--cat) uppercase">
            <CatIcon cat={m.cat} className="size-7 rounded-lg text-sm" />
            {CATS[m.cat].name}
          </div>
          <Tag tone={cls}>{status}</Tag>
        </div>
        <div className="mt-4 font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
          {m.n}
        </div>
        <div
          className={cx(
            "mt-2.5 flex items-baseline gap-2 font-display leading-none font-bold tracking-[-0.03em]",
            m.qual ? "text-[32px]" : "text-[52px]",
            cls === "lo" && "text-warn",
            cls === "hi" && "text-bad"
          )}
        >
          {m.qual ? m.cur : fmt(m.cur)}
          {!m.qual && (
            <small className="font-sans text-lg font-medium tracking-normal text-ink-3">
              {m.u}
            </small>
          )}
        </div>
        <div className="mt-2 text-[13px] font-medium text-ink-3">
          Collected {fmtDate(m.latest.d)} · {sourceName(m.latest.s)}
        </div>
        {!m.qual && m.prev != null && (
          <div className="mt-3.5 flex justify-between border-t border-sep pt-3.5 text-[13px] font-medium text-ink-2">
            <span>
              Previous:{" "}
              <b className="font-semibold text-ink">
                {fmt(m.prev)} {m.u}
              </b>{" "}
              on {fmtDate(m.records[1].d)}
            </span>
            <span>
              Change:{" "}
              <b className="font-semibold text-ink">
                {m.cur - m.prev >= 0 ? "+" : ""}
                {fmt(m.cur - m.prev)} {m.u}
              </b>
            </span>
          </div>
        )}
      </div>

      <Chart m={m} color={color} />

      <SubHeading>Details</SubHeading>
      <div className="surface grid grid-cols-3 gap-2 p-4">
        <Stat label="Status">
          <span className={cls === "in" ? "text-good" : cls === "lo" ? "text-warn" : "text-bad"}>
            {status}
          </span>
        </Stat>
        <Stat label="Reference">{reference}</Stat>
        <Stat label="Sources">{sources}</Stat>
      </div>

      <SubHeading>Records · {m.records.length}</SubHeading>
      <div className="mt-1.5">
        {m.records.map((_, index) => (
          <RecordCard key={index} m={m} index={index} />
        ))}
      </div>

      {reports.length > 0 && (
        <>
          <SubHeading>Source reports</SubHeading>
          <div className="surface overflow-hidden">
            {reports.map((r) => (
              <a
                key={`${r.src}|${r.date}`}
                href={r.pdf}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between gap-3 border-b border-sep px-4 py-3 transition-colors last:border-b-0 active:bg-card-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-[1.2] font-semibold">
                    {r.sourceName} · {r.title}
                  </div>
                  <div className="mt-0.75 text-xs leading-[1.3] text-ink-3">
                    {fmtDate(r.date)} · open PDF ↗
                  </div>
                </div>
                <Chevron />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Chart({ m, color }: { m: Metric; color: string }) {
  if (m.qual) return null
  if (m.records.length >= 2)
    return (
      <>
        <SubHeading>Trend</SubHeading>
        <TrendChart m={m} color={color} />
      </>
    )
  return (
    <>
      <SubHeading>Where you land</SubHeading>
      <Card>
        <div className="eyebrow">Single measurement · {fmtDate(m.latest.d)}</div>
        <div className="mt-1.5 font-display text-[22px] leading-[1.2] font-bold tracking-[-0.01em]">
          {fmt(m.cur)} {m.u}
        </div>
        <RangeBar v={m.cur} lo={m.lo} hi={m.hi} cls={classify(m)} unit={m.u} hero />
      </Card>
    </>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1">
      <div className="text-[11px] leading-none font-semibold tracking-[0.04em] text-ink-3 uppercase">
        {label}
      </div>
      <div className="mt-1.5 font-display text-[17px] leading-[1.1] font-semibold tracking-[-0.01em]">
        {children}
      </div>
    </div>
  )
}
