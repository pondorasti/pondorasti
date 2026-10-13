import { TARGETS } from "../config"
import type { Totals } from "../lib/nutrition"
import { grams, kcal } from "../lib/format"
import { TargetBar } from "./progress"

/** Calories, protein and fiber against their targets, with carbs and fat alongside. */
export function DayTargets({ totals }: { totals: Totals }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <TargetBar
        label="Calories"
        value={totals.kcal}
        goal={TARGETS.kcal}
        unit="kcal"
        format={kcal}
        note={`${grams(totals.carbs)} g carbs · ${grams(totals.fat)} g fat`}
      />
      <TargetBar
        label="Protein"
        value={totals.protein}
        goal={TARGETS.protein}
        unit="g"
        format={grams}
        note={
          totals.protein >= TARGETS.protein
            ? "Target reached"
            : `${grams(TARGETS.protein - totals.protein)} g to go`
        }
      />
      <TargetBar
        label="Fiber"
        value={totals.fiber}
        goal={TARGETS.fiber}
        unit="g"
        format={grams}
        note={
          totals.fiberUnknown
            ? `${totals.fiberUnknown} ${totals.fiberUnknown === 1 ? "item has" : "items have"} no fiber logged`
            : `${totals.entries} ${totals.entries === 1 ? "item" : "items"} logged`
        }
      />
    </div>
  )
}
