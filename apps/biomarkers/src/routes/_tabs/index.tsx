import { createFileRoute } from "@tanstack/react-router"
import { MetricCard } from "~/components/metric-card"
import { CatIcon, catStyle, Grid, Section } from "~/components/ui"
import { CATS } from "~/data"
import {
  favorites,
  flagged,
  fmtDate,
  highlights,
  latestDate,
  recent,
  recentSource
} from "~/metrics"

export const Route = createFileRoute("/_tabs/")({
  component: Summary
})

function Summary() {
  return (
    <section>
      <Section title="Highlights" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {highlights.map((h) => (
          <div
            key={h.title}
            style={catStyle(h.cat)}
            className="surface relative overflow-hidden px-3.5 pt-3.5 pb-3"
          >
            <div className="eyebrow flex items-center gap-2">
              <CatIcon cat={h.cat} className="size-4.5 rounded-md text-[10px]" />
              {CATS[h.cat].name}
            </div>
            <div className="mt-2 font-display text-[17px] leading-[1.2] font-semibold tracking-[-0.01em]">
              {h.title}
            </div>
            <div className="mt-1 text-[13px] leading-[1.35] text-ink-2">
              {h.body.map((part, i) => (typeof part === "string" ? part : <b key={i}>{part.b}</b>))}
            </div>
          </div>
        ))}
      </div>

      <Section title="Favorites" />
      <Grid>
        {favorites.map((m) => (
          <MetricCard key={m.id} m={m} />
        ))}
      </Grid>

      <Section title="Out of range" meta={fmtDate(latestDate)} />
      {flagged.length ? (
        <Grid>
          {flagged.map((m) => (
            <MetricCard key={m.id} m={m} />
          ))}
        </Grid>
      ) : (
        <div className="p-5 text-center text-sm text-ink-3">
          All current measurements are in range.
        </div>
      )}

      <Section title="Most recent panel" meta={`${fmtDate(latestDate)} · ${recentSource}`} />
      <Grid>
        {recent.map((m) => (
          <MetricCard key={m.id} m={m} />
        ))}
      </Grid>
    </section>
  )
}
