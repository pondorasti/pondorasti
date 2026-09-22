import { Accordion } from "@base-ui/react/accordion"
import { createFileRoute } from "@tanstack/react-router"
import { MetricCard } from "~/components/metric-card"
import { CatIcon, catStyle, Chevron, Chip, Grid, Section } from "~/components/ui"
import { IGE_NEGS, IGG } from "~/data"
import { categories } from "~/metrics"

export const Route = createFileRoute("/_tabs/browse")({
  component: Browse
})

const sensitivities = [...IGG].sort((a, b) => b[1] - a[1])

function Browse() {
  return (
    <section>
      <Section title="Browse" />
      <Accordion.Root multiple className="surface overflow-hidden">
        {categories.map((c) => (
          <Accordion.Item
            key={c.key}
            value={c.key}
            style={catStyle(c.key)}
            className="border-b border-sep last:border-b-0"
          >
            <Accordion.Header className="m-0">
              <Accordion.Trigger className="grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-card-2 data-panel-open:bg-card-2">
                <CatIcon cat={c.key} className="size-8 rounded-lg text-[15px]" />
                <div>
                  <div className="text-[17px] leading-[1.2] font-semibold tracking-[-0.005em]">
                    {c.name}
                  </div>
                  <div className="mt-0.75 text-[13px] leading-none text-ink-3">{c.desc}</div>
                </div>
                <div className="flex items-center gap-1 text-sm leading-none font-medium text-ink-3">
                  {c.flagged > 0 && (
                    <span
                      className="mr-2 inline-block size-2 rounded-full bg-warn"
                      aria-label={`${c.flagged} out of range`}
                    />
                  )}
                  {c.items.length} <Chevron />
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="border-t border-sep">
              <Grid className="p-3">
                {c.items.map((m) => (
                  <MetricCard key={m.id} m={m} />
                ))}
              </Grid>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <Section title="Food sensitivities" meta="IgG · Dec 19, 2025" />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
          {sensitivities.map(([name, value]) => (
            <Chip key={name} tone={value >= 4 ? "bad" : "warn"}>
              {name} <small className="text-ink-3">{value}</small>
            </Chip>
          ))}
        </div>
        <div className="px-4 py-3 text-xs leading-[1.4] text-ink-3">
          Reference: &lt;2.0 mcg/mL. Quest's own note: IgG testing “should not be used for the
          diagnosis of allergic or atopic disease states” — most useful for tracking
          elimination/reintroduction responses. All <b>IgE</b> food &amp; environmental allergens
          were <b>Class 0 (Absent)</b>.
        </div>
      </div>

      <Section title="Allergens tested · all negative" />
      <div className="surface flex flex-wrap gap-1.5 px-4 py-3.5">
        {IGE_NEGS.map((name) => (
          <Chip key={name} tone="good">
            {name}
          </Chip>
        ))}
      </div>
    </section>
  )
}
