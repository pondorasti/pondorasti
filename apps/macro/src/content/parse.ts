import { z } from "zod"
import { type Entry, IsoDate, Meal, Time, type WeighIn } from "../lib/nutrition"
import { parseCsv } from "./csv"

export const MEALS_HEADER = [
  "date",
  "time",
  "meal",
  "item",
  "kcal",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g"
] as const
export const WEIGH_INS_HEADER = ["date", "time", "kg"] as const

const amount = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "expected a non-negative number")
    .transform(Number)
    .pipe(z.number().max(max))

const MealRow = z
  .strictObject({
    date: IsoDate,
    time: Time,
    meal: Meal,
    item: z.string().trim().min(1, "item is required"),
    kcal: amount(10_000),
    protein_g: amount(1_000),
    carbs_g: amount(2_000),
    fat_g: amount(1_000),
    fiber_g: z.union([z.literal("").transform(() => null), amount(500)])
  })
  .transform((row): Entry => ({
    date: row.date,
    time: row.time,
    meal: row.meal,
    item: row.item,
    kcal: row.kcal,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    fiber: row.fiber_g
  }))

const WeighInRow = z.strictObject({
  date: IsoDate,
  time: Time,
  kg: amount(500).pipe(z.number().min(20, "kg looks wrong"))
})

/**
 * Parses a CSV with an exact header into validated rows. Every bad row is reported, as
 * `<file>:<line>: <problem>`, in one error.
 */
function parseRows<T>(
  file: string,
  text: string,
  header: readonly string[],
  schema: z.ZodType<T>
): T[] {
  let records
  try {
    records = parseCsv(text)
  } catch (error) {
    throw new Error(
      `${file}:${(error instanceof Error ? error.message : String(error)).replace(/^line /, "")}`
    )
  }
  const [head, ...rows] = records
  if (!head || head.fields.join(",") !== header.join(",")) {
    throw new Error(`${file}:${head?.line ?? 1}: header must be exactly ${header.join(",")}`)
  }
  const errors: string[] = []
  const parsed: T[] = []
  for (const { line, fields } of rows) {
    if (fields.length !== header.length) {
      errors.push(`${file}:${line}: expected ${header.length} fields, got ${fields.length}`)
      continue
    }
    const result = schema.safeParse(Object.fromEntries(header.map((key, i) => [key, fields[i]])))
    if (result.success) parsed.push(result.data)
    else {
      for (const issue of result.error.issues) {
        errors.push(`${file}:${line}: ${issue.path.join(".") || "row"}: ${issue.message}`)
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"))
  return parsed
}

export const parseMeals = (text: string, file = "meals.csv") =>
  parseRows(file, text, MEALS_HEADER, MealRow)

export const parseWeighIns = (text: string, file = "weigh-ins.csv"): WeighIn[] =>
  parseRows(file, text, WEIGH_INS_HEADER, WeighInRow)
