import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Chevron, cx, Section } from "~/components/ui"
import type { SourceId } from "~/data"
import { fmtDateShort, reports, reportsByYear, type Report } from "~/metrics"

export const Route = createFileRoute("/_tabs/reports")({
  component: Reports
})

// Official brand marks, used to identify each report's source lab.
const LOGOS: Record<SourceId, { src: string; letter: string; color: string }> = {
  function: { src: "/logos/function.png", letter: "F", color: "var(--vit)" },
  quest: { src: "/logos/quest.png", letter: "Q", color: "var(--cancer)" },
  labcorp: { src: "/logos/labcorp-mark.svg", letter: "L", color: "var(--immune)" },
  kaiser: { src: "/logos/kaiser-mark.svg", letter: "K", color: "var(--hormone)" }
}

const plural = (n: number) => `${n} report${n === 1 ? "" : "s"}`

function Reports() {
  return (
    <section>
      <Section title="Lab reports" meta={plural(reports.length)} />
      {reportsByYear.map(([year, rows]) => (
        <div key={year} className="mt-5.5 first:mt-1.5">
          <div className="flex items-baseline justify-between px-1 font-display text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">
            <span>{year}</span>
            <span className="font-sans text-[13px] leading-none font-medium tracking-normal text-ink-3">
              {plural(rows.length)}
            </span>
          </div>
          <div className="surface mt-2.5 overflow-hidden">
            {rows.map((r) => (
              <a
                key={`${r.src}|${r.date}`}
                href={r.pdf}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3.5 border-b border-sep px-4 py-3.25 transition-colors last:border-b-0 active:bg-card-2"
              >
                <Logo report={r} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-[1.2] font-semibold">{r.title}</div>
                  <div className="mt-0.75 text-xs leading-[1.3] text-ink-3">{r.sourceName}</div>
                </div>
                <div className="text-sm leading-none font-medium whitespace-nowrap text-ink-3">
                  {fmtDateShort(r.date)}
                </div>
                <Chevron />
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function Logo({ report }: { report: Report }) {
  const [failed, setFailed] = useState(false)
  const logo = LOGOS[report.src]
  return (
    <div
      className="relative flex size-9.5 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white text-[13px] leading-none font-bold tracking-[0.04em] shadow-[inset_0_0_0_1px_rgba(60,60,67,0.1)]"
      style={{ color: logo.color }}
    >
      {failed ? (
        logo.letter
      ) : (
        <img
          src={logo.src}
          alt={report.sourceName}
          onError={() => setFailed(true)}
          className={cx(
            "absolute inset-0 size-full",
            report.src === "function" ? "object-cover" : "object-contain p-1.5"
          )}
        />
      )}
    </div>
  )
}
