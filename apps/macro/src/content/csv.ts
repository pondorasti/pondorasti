export interface CsvRecord {
  /** 1-based line in the file where the record starts. */
  line: number
  fields: string[]
}

/**
 * Parses RFC 4180 CSV: fields may be quoted, quoted fields may hold commas, newlines and `""`
 * for a literal quote. Blank lines are skipped; CRLF and a leading BOM are accepted.
 */
export function parseCsv(text: string): CsvRecord[] {
  const source = text.startsWith("\uFEFF") ? text.slice(1) : text
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ""
  let quoted = false
  let touched = false
  let line = 1
  let start = 1

  const endField = () => {
    fields.push(field)
    field = ""
    touched = false
  }
  const endRecord = () => {
    endField()
    if (fields.length > 1 || fields[0] !== "") records.push({ line: start, fields })
    fields = []
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        if (char === "\n") line++
        field += char
      }
    } else if (char === '"') {
      if (touched || field !== "") throw new Error(`line ${line}: unexpected quote inside a field`)
      quoted = true
      touched = true
    } else if (char === ",") {
      endField()
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++
      endRecord()
      line++
      start = line
    } else {
      if (touched) throw new Error(`line ${line}: text after a closing quote`)
      field += char
    }
  }
  if (quoted) throw new Error(`line ${start}: unterminated quoted field`)
  endRecord()
  return records
}
