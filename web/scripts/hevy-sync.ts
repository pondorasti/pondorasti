/**
 * Sync `current` load values in web/src/data.ts from actual Hevy logs.
 *
 *   bun web/scripts/hevy-sync.ts          # rewrite data.ts
 *   bun web/scripts/hevy-sync.ts --dry    # show what would change
 *
 * Current = top working-set weight from the most recent workout containing
 * the exercise. Rows whose exercises have never been logged are left alone.
 * Run from repo root (bun loads .env for HEVY_API_KEY).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { loads, loadRowExercises, type ExerciseId } from '../src/data'

const KEY = process.env.HEVY_API_KEY
const DRY = process.argv.includes('--dry')
if (!KEY) {
  console.error('✗ HEVY_API_KEY not set — run from repo root')
  process.exit(1)
}

/** Hevy exercise_template_id → our ExerciseId */
const TEMPLATE_TO_EX: Record<string, ExerciseId> = {
  '79D0BB3A': 'bench-press',
  '07B38369': 'incline-db-press',
  '7B8D84E8': 'overhead-press',
  '9237BAD1': 'machine-overhead-press',
  '059E835D': 'machine-overhead-press', // old Machine Plates template
  'DE68C825': 'lateral-raise',
  '94B7239B': 'triceps-pushdown',
  'B5EFBF9C': 'overhead-triceps',
  '55E6546F': 'barbell-row',
  '6A6C31A5': 'lat-pulldown',
  'F1D60854': 'seated-row',
  'BE640BA0': 'face-pull',
  '8BAB2735': 'incline-curl',
  'ADA8623C': 'incline-curl', // cable curl logs count toward the curl row
  '7E3BC8B6': 'hammer-curl',
  '37FCC2BB': 'hammer-curl', // db curl (giant set)
  'D04AC939': 'squat',
  'C7973E0E': 'leg-press',
  '75A4F6C4': 'leg-extension',
  'B8127AD1': 'leg-curl',
  '91237BDD': 'calf-raise',
  '2B4B7310': 'rdl',
}

async function api(path: string): Promise<any> {
  const res = await fetch(`https://api.hevyapp.com/v1${path}`, { headers: { 'api-key': KEY! } })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

// latest per exercise: {when, topWeightKg}
const latest = new Map<ExerciseId, { when: string; kg: number }>()
let page = 1
for (;;) {
  const d = await api(`/workouts?page=${page}&pageSize=10`)
  for (const w of d.workouts ?? []) {
    for (const e of w.exercises) {
      const ex = TEMPLATE_TO_EX[e.exercise_template_id]
      if (!ex) continue
      const weights = e.sets.map((s: any) => s.weight_kg).filter((x: any) => x != null) as number[]
      if (!weights.length) continue
      const top = Math.max(...weights)
      const when = w.start_time ?? ''
      const prev = latest.get(ex)
      if (!prev || when > prev.when) latest.set(ex, { when, kg: top })
    }
  }
  if (page >= (d.page_count ?? 1)) break
  page++
}

const fmt = (kg: number): string => {
  const lb = Math.round(kg / 0.45359237)
  const kgR = Math.round(kg * 2) / 2
  const kgS = Number.isInteger(kgR) ? String(kgR) : kgR.toFixed(1)
  return `${kgS} kg / ${lb} lb`
}

const path = new URL('../src/data.ts', import.meta.url).pathname
let src = readFileSync(path, 'utf8')
let changed = 0

for (const g of loads) {
  for (const row of g.rows) {
    const exs = loadRowExercises(row)
    if (!exs.length) continue
    const hits = exs.map((e) => latest.get(e)).filter(Boolean) as { when: string; kg: number }[]
    if (!hits.length) {
      console.log(`· ${row.name.padEnd(22)} no logs — unchanged (${row.current})`)
      continue
    }
    const newest = hits.sort((a, b) => (a.when > b.when ? -1 : 1))[0]
    const next = fmt(newest.kg)
    if (next === row.current) {
      console.log(`= ${row.name.padEnd(22)} ${row.current}`)
      continue
    }
    const needle = `current: '${row.current}'`
    if (!src.includes(needle)) {
      console.error(`✗ could not find "${needle}" for ${row.name}`)
      continue
    }
    src = src.replace(needle, `current: '${next}'`)
    changed++
    console.log(`✓ ${row.name.padEnd(22)} ${row.current}  →  ${next}  (logged ${newest.when.slice(0, 10)})`)
  }
}

if (DRY) {
  console.log(`\n[DRY] ${changed} row(s) would change — nothing written`)
} else {
  writeFileSync(path, src)
  console.log(`\n${changed} row(s) updated in data.ts`)
}
