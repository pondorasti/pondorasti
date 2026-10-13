import type { MealGroup, Totals } from "../lib/nutrition"
import { grams, kcal, label } from "../lib/format"

const Macros = ({ totals, className = "" }: { totals: Totals; className?: string }) => (
  <span className={`tabular-nums ${className}`}>
    {grams(totals.protein)} P · {grams(totals.carbs)} C · {grams(totals.fat)} F ·{" "}
    {grams(totals.fiber)}
    {totals.fiberUnknown ? "+" : ""} fiber
  </span>
)

/** A day's meals, each with its items and subtotal. */
export function MealList({ meals }: { meals: MealGroup[] }) {
  return (
    <div className="space-y-3">
      {meals.map(({ meal, entries, totals }, index) => (
        <section key={index} aria-label={label(meal)} className="card">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-medium">
              {label(meal)}
              <span className="ml-2 text-sm font-normal text-muted tabular-nums">
                {entries[0].time}
              </span>
            </h3>
            <p className="text-sm">
              <span className="font-medium tabular-nums">{kcal(totals.kcal)} kcal</span>
              <Macros totals={totals} className="ml-2 text-muted" />
            </p>
          </header>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {entries.map((entry, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 py-2.5 text-sm sm:grid-cols-[3.5rem_1fr_auto_auto]"
              >
                <span className="hidden text-muted tabular-nums sm:block">{entry.time}</span>
                <span className="min-w-0 break-words">{entry.item}</span>
                <span className="text-right tabular-nums">{kcal(entry.kcal)} kcal</span>
                <span className="col-span-2 text-xs text-muted tabular-nums sm:col-span-1 sm:w-52 sm:text-right sm:text-sm">
                  {grams(entry.protein)} P · {grams(entry.carbs)} C · {grams(entry.fat)} F ·{" "}
                  {entry.fiber === null ? "–" : grams(entry.fiber)} fiber
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
