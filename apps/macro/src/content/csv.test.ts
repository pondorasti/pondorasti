import { describe, expect, it } from "vite-plus/test"
import { parseCsv } from "./csv"

describe("parseCsv", () => {
  it("splits plain fields and keeps empty ones", () => {
    expect(parseCsv("a,b,c\n1,,3\n")).toEqual([
      { line: 1, fields: ["a", "b", "c"] },
      { line: 2, fields: ["1", "", "3"] }
    ])
  })

  it("supports quoted fields with commas, escaped quotes and newlines", () => {
    expect(
      parseCsv('item,kcal\n"Chips, salted",150\n"RXBAR ""Choc""",210\n"two\nlines",1\nlast,2')
    ).toEqual([
      { line: 1, fields: ["item", "kcal"] },
      { line: 2, fields: ["Chips, salted", "150"] },
      { line: 3, fields: ['RXBAR "Choc"', "210"] },
      { line: 4, fields: ["two\nlines", "1"] },
      { line: 6, fields: ["last", "2"] }
    ])
  })

  it("keeps & and apostrophes as-is, accepts CRLF and a BOM, and skips blank lines", () => {
    expect(parseCsv("\uFEFFitem\r\nTrader Joe's mac & cheese\r\n\r\n\nx\r\n")).toEqual([
      { line: 1, fields: ["item"] },
      { line: 2, fields: ["Trader Joe's mac & cheese"] },
      { line: 5, fields: ["x"] }
    ])
  })

  it("rejects malformed quoting with a line number", () => {
    expect(() => parseCsv('a\n"open')).toThrow("line 2: unterminated quoted field")
    expect(() => parseCsv('a\n"done"x')).toThrow("line 2: text after a closing quote")
    expect(() => parseCsv('a\nhalf"way')).toThrow("line 2: unexpected quote")
  })
})
