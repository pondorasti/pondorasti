import { readFileSync } from "node:fs"
import path from "node:path"
import type { Entry, WeighIn } from "../lib/nutrition"
import { parseMeals, parseWeighIns } from "./parse"

export interface Content {
  /** Oldest first; rows at the same date and time keep their file order. */
  meals: Entry[]
  /** Oldest first. */
  weighIns: WeighIn[]
}

/** Reads and validates both CSVs; throws once, listing every invalid row in either file. */
export function loadContent(dir: string): Content {
  const errors: string[] = []
  const read = <T extends { date: string; time: string }>(
    file: string,
    parse: (text: string, file: string) => T[]
  ): T[] => {
    try {
      return parse(readFileSync(path.join(dir, file), "utf8"), `content/${file}`).sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      )
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      return []
    }
  }
  const meals = read("meals.csv", parseMeals)
  const weighIns = read("weigh-ins.csv", parseWeighIns)
  if (errors.length) throw new Error(`Invalid content:\n${errors.join("\n")}`)
  return { meals, weighIns }
}
