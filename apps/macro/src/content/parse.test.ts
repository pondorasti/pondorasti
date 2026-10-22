import { describe, expect, it } from "vite-plus/test"
import { parseMeals, parseWeighIns } from "./parse"

const MEALS = "date,time,meal,item,kcal,protein_g,carbs_g,fat_g,fiber_g\n"

describe("meals.csv", () => {
  it("parses rows, renaming gram columns and reading blank fiber as unknown", () => {
    expect(
      parseMeals(
        `${MEALS}2026-10-13,08:31,breakfast,Trader Joe's pancakes & syrup,555,30,85,10,5\n2026-10-13,15:35,post-workout,"Chips, salted",150,2,16,9.5,\n2026-10-21,18:23,dessert,Häagen-Dazs Vanilla Milk Chocolate Almond bar,310,5,25,21,1\n`
      )
    ).toEqual([
      {
        date: "2026-10-13",
        time: "08:31",
        meal: "breakfast",
        item: "Trader Joe's pancakes & syrup",
        kcal: 555,
        protein: 30,
        carbs: 85,
        fat: 10,
        fiber: 5
      },
      {
        date: "2026-10-13",
        time: "15:35",
        meal: "post-workout",
        item: "Chips, salted",
        kcal: 150,
        protein: 2,
        carbs: 16,
        fat: 9.5,
        fiber: null
      },
      {
        date: "2026-10-21",
        time: "18:23",
        meal: "dessert",
        item: "Häagen-Dazs Vanilla Milk Chocolate Almond bar",
        kcal: 310,
        protein: 5,
        carbs: 25,
        fat: 21,
        fiber: 1
      }
    ])
  })

  it("reports every bad row with its file and line", () => {
    const parse = () =>
      parseMeals(
        `${MEALS}2026-02-30,08:00,breakfast,Eggs,300,20,1,20,0\n2026-10-01,8:00,brunch,Eggs,-3,20,1,20,0\n2026-10-01,08:00,lunch,Eggs,300\n`,
        "content/meals.csv"
      )
    expect(parse).toThrow("content/meals.csv:2: date: not a real calendar date")
    expect(parse).toThrow("content/meals.csv:3: time: expected HH:MM (24h)")
    expect(parse).toThrow(/content\/meals.csv:3: meal: /)
    expect(parse).toThrow("content/meals.csv:3: kcal: expected a non-negative number")
    expect(parse).toThrow("content/meals.csv:4: expected 9 fields, got 5")
  })

  it("requires the exact header", () => {
    expect(() => parseMeals("date,time,meal,item,kcal\n", "content/meals.csv")).toThrow(
      "content/meals.csv:1: header must be exactly date,time,meal,item,kcal,protein_g,carbs_g,fat_g,fiber_g"
    )
  })
})

describe("weigh-ins.csv", () => {
  it("parses readings and rejects implausible ones", () => {
    expect(parseWeighIns("date,time,kg\n2026-10-13,07:17,72.8\n")).toEqual([
      { date: "2026-10-13", time: "07:17", kg: 72.8 }
    ])
    expect(() => parseWeighIns("date,time,kg\n2026-10-13,07:17,7.28\n")).toThrow(
      "weigh-ins.csv:2: kg: kg looks wrong"
    )
    expect(() => parseWeighIns("date,time,kg\n2026-10-13,07:17,\n")).toThrow(
      "weigh-ins.csv:2: kg: expected a non-negative number"
    )
  })
})
