import { createFileRoute, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { TARGETS } from "../config"
import {
  ExploreBar,
  allEntries,
  fiberText,
  loadExploreDay,
  pct,
  validateExploreSearch
} from "../explore/shared"
import { dateLong, grams, kcal, label } from "../lib/format"
import { fromIso } from "../lib/nutrition"
import { dayQuery } from "../read/queries"

export const Route = createFileRoute("/explore/c")({
  validateSearch: validateExploreSearch,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ context, deps }) => {
    const date = await loadExploreDay(context.queryClient, deps.date)
    if (!date) throw notFound()
    return date
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ meta: [{ title: "C · Receipt | Macro" }] }),
  component: DirectionC
})

const stamp = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC"
})

const ZIGZAG =
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 14px 51% repeat-x, conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 14px 51% repeat-x"

const Rule = ({ double = false }: { double?: boolean }) => (
  <div
    aria-hidden
    className={`my-3 border-current/60 ${double ? "border-t-[3px] border-double" : "border-t border-dashed"}`}
  />
)

const Line = ({
  left,
  right,
  className = ""
}: {
  left: ReactNode
  right: ReactNode
  className?: string
}) => (
  <div className={`flex items-baseline justify-between gap-3 ${className}`}>
    <span className="min-w-0">{left}</span>
    <span className="shrink-0 text-right">{right}</span>
  </div>
)

function Barcode({ seed }: { seed: string }) {
  const digits = seed.replace(/\D/g, "").split("").map(Number)
  return (
    <div aria-hidden className="flex h-12 items-stretch justify-center gap-[2px]">
      {digits.flatMap((d, i) => [
        <span key={`b${i}`} className="bg-current" style={{ width: (d % 3) + 1 }} />,
        <span key={`g${i}`} style={{ width: ((d + i) % 3) + 1 }} />,
        <span key={`c${i}`} className="bg-current" style={{ width: ((d * 7 + i) % 4) + 1 }} />
      ])}
    </div>
  )
}

function DirectionC() {
  const date = Route.useLoaderData()
  const { data: day } = useSuspenseQuery(dayQuery(date))
  if (!day) throw notFound()
  const { totals } = day
  const entries = allEntries(day.meals)
  const diff = totals.kcal - TARGETS.kcal
  const rows = [
    ["Protein", totals.protein, `${TARGETS.protein}`, pct(totals.protein, TARGETS.protein)],
    ["Carbs", totals.carbs, `${TARGETS.carbs}`, pct(totals.carbs, TARGETS.carbs)],
    ["Fat", totals.fat, `${TARGETS.fat}`, pct(totals.fat, TARGETS.fat)],
    [
      "Fiber",
      totals.fiber,
      `${TARGETS.fiber.min}-${TARGETS.fiber.max}`,
      pct(totals.fiber, TARGETS.fiber.min)
    ]
  ] as const

  return (
    <main id="main" className="page-width pb-16">
      <ExploreBar current="c" date={day.date} prev={day.prev} next={day.next} />
      <h1 className="sr-only">{dateLong(day.date)}</h1>

      <div className="mt-6 flex justify-center">
        <article
          aria-label="Nutrition receipt"
          className="w-full max-w-[440px] bg-[#fbfaf5] px-5 py-8 font-mono text-[13px] leading-[1.55] text-[#1d1c1a] tabular-nums shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)] sm:px-7 dark:bg-[#1f1e1b] dark:text-[#ebe7dc]"
          style={{ mask: ZIGZAG, WebkitMask: ZIGZAG }}
        >
          <header className="text-center uppercase">
            <p className="text-[22px] font-bold tracking-[0.3em]">Macro</p>
            <p className="tracking-[0.2em]">Nutrition receipt</p>
            <p className="mt-2 opacity-70">
              {stamp.format(fromIso(day.date))} · {entries[0].time}–{entries.at(-1)!.time}
            </p>
          </header>

          <Rule />
          <Line left="ITEM" right="KCAL" className="font-bold" />
          <Rule />

          {entries.map((entry, i) => (
            <div key={i}>
              {(i === 0 || entries[i - 1].run !== entry.run) && (
                <p
                  className={`text-[11px] tracking-[0.15em] uppercase opacity-60 ${i ? "mt-3" : ""}`}
                >
                  ** {label(entry.meal)} **
                </p>
              )}
              <div className="py-1">
                <Line left={entry.item} right={kcal(entry.kcal)} />
                <p className="text-[11px] opacity-60">
                  {entry.time} &nbsp;P {grams(entry.protein)} &nbsp;C {grams(entry.carbs)} &nbsp;F{" "}
                  {grams(entry.fat)} &nbsp;FB {fiberText(entry.fiber)}
                </p>
              </div>
            </div>
          ))}

          <Rule double />
          <Line left="ITEMS" right={totals.entries} />
          <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 uppercase">
            <span className="text-[11px] opacity-60">Nutrient</span>
            <span className="text-right text-[11px] opacity-60">g / target</span>
            <span className="text-right text-[11px] opacity-60">%DT</span>
            {rows.map(([name, value, target, percent]) => (
              <div key={name} className="contents">
                <span>{name}</span>
                <span className="text-right">
                  {grams(value)}
                  {name === "Fiber" && totals.fiberUnknown > 0 ? "+" : ""} / {target}
                </span>
                <span className="text-right font-bold">{percent}%</span>
              </div>
            ))}
          </div>
          <Rule />
          <Line left="TARGET" right={kcal(TARGETS.kcal)} />
          <Line
            left={diff >= 0 ? "OVER TARGET" : "UNDER TARGET"}
            right={`${diff >= 0 ? "+" : "−"}${kcal(Math.abs(diff))}`}
          />
          <Rule double />
          <Line
            left={<span className="text-[17px] font-bold tracking-[0.08em]">TOTAL KCAL</span>}
            right={<span className="text-[30px] leading-none font-bold">{kcal(totals.kcal)}</span>}
          />
          <p className="mt-1 text-right text-[11px] opacity-60">
            {pct(totals.kcal, TARGETS.kcal)}% OF DAILY TARGET
          </p>
          <Rule />
          <Barcode seed={`${day.date}${Math.round(totals.kcal)}${Math.round(totals.protein)}`} />
          <p className="mt-2 text-center text-[11px] tracking-[0.2em] uppercase opacity-60">
            Lean bulk · Thank you
          </p>
        </article>
      </div>
    </main>
  )
}
