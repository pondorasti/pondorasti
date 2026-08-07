/**
 * Import the buff routine (web/src/data.ts) into Hevy as 5 routines.
 *
 *   bun web/scripts/hevy-import.ts --dry   # print resolved plan, no writes
 *   bun web/scripts/hevy-import.ts         # create folder + routines
 *
 * Run from the repo root so bun auto-loads .env (HEVY_API_KEY).
 * Idempotent: routines whose titles already exist are skipped.
 */
import { days, loadsForExercise, type DayItem, type ExerciseId } from '../src/data'

const API = 'https://api.hevyapp.com/v1'
const KEY = process.env.HEVY_API_KEY
const DRY = process.argv.includes('--dry')

if (!KEY) {
  console.error('✗ HEVY_API_KEY not set — run from repo root so bun loads .env')
  process.exit(1)
}

// ---------- Hevy request types ----------
interface HevySet {
  type: 'normal'
  weight_kg: number | null
  reps: number | null
  rep_range: { start: number; end: number } | null
}
interface HevyExercise {
  exercise_template_id: string
  superset_id: number | null
  rest_seconds: number
  notes: string | null
  sets: HevySet[]
}
interface HevyRoutine {
  title: string
  folder_id: number | null
  notes: string
  exercises: HevyExercise[]
}

// ---------- template resolution ----------
/** Candidate Hevy template titles per exercise id — first match wins. */
const CANDIDATES: Record<ExerciseId, string[]> = {
  'bench-press': ['Bench Press (Barbell)'],
  'incline-db-press': ['Incline Bench Press (Dumbbell)'],
  'overhead-press': ['Overhead Press (Barbell)', 'Seated Overhead Press (Barbell)', 'Shoulder Press (Barbell)'],
  'machine-overhead-press': ['Seated Shoulder Press (Machine)', 'Shoulder Press (Machine)', 'Shoulder Press (Machine Plates)'],
  'lateral-raise': ['Single Arm Lateral Raise (Cable)', 'Lateral Raise (Cable)'],
  'triceps-pushdown': ['Triceps Rope Pushdown', 'Triceps Pushdown', 'Triceps Pushdown (Cable - Straight Bar)'],
  'overhead-triceps': ['Overhead Triceps Extension (Cable)', 'Triceps Extension (Cable)', 'Single Arm Tricep Extension (Cable)'],
  'barbell-row': ['Bent Over Row (Barbell)'],
  'lat-pulldown': ['Lat Pulldown (Cable)', 'Lat Pulldown (Machine)'],
  'seated-row': ['Seated Cable Row - Bar Grip', 'Seated Cable Row - V Grip (Cable)', 'Seated Row (Cable)', 'Seated Row (Machine)'],
  'face-pull': ['Face Pull', 'Face Pull (Cable)'],
  'incline-curl': ['Seated Incline Curl (Dumbbell)', 'Incline Curl (Dumbbell)'],
  'hammer-curl': ['Hammer Curl (Dumbbell)'],
  'squat': ['Squat (Barbell)'],
  'leg-press': ['Leg Press (Machine)', 'Leg Press Horizontal (Machine)'],
  'leg-extension': ['Leg Extension (Machine)'],
  'leg-curl': ['Lying Leg Curl (Machine)', 'Seated Leg Curl (Machine)'],
  'calf-raise': ['Calf Press (Machine)', 'Calf Press On Leg Press', 'Standing Calf Raise (Machine)'],
  'rdl': ['Romanian Deadlift (Barbell)'],
}

/** Extra templates used by composite rows (no ExerciseId). */
const EXTRA_CANDIDATES: Record<string, string[]> = {
  'cable-curl': ['Bicep Curl (Cable)', 'Cable Curl'],
  'db-curl': ['Bicep Curl (Dumbbell)'],
  'knee-raise': ['Hanging Knee Raise', 'Knee Raise (Captains Chair)', 'Hanging Leg Raise'],
  'cable-crunch': ['Cable Crunch', 'Crunch (Cable)', 'Kneeling Cable Crunch'],
}

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'api-key': KEY!, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function fetchTemplates(): Promise<Map<string, { id: string; title: string }>> {
  const byTitle = new Map<string, { id: string; title: string }>()
  let page = 1
  for (;;) {
    const d = await api(`/exercise_templates?page=${page}&pageSize=100`)
    for (const t of d.exercise_templates) byTitle.set(t.title.toLowerCase(), { id: t.id, title: t.title })
    if (page >= d.page_count) break
    page++
  }
  return byTitle
}

function resolveTemplate(
  key: string,
  candidates: string[],
  templates: Map<string, { id: string; title: string }>,
): { id: string; title: string } {
  for (const c of candidates) {
    const hit = templates.get(c.toLowerCase())
    if (hit) return hit
  }
  const words = candidates[0].toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3)
  const suggestions = [...templates.values()]
    .filter((t) => words.some((w) => t.title.toLowerCase().includes(w)))
    .map((t) => t.title)
    .slice(0, 12)
  console.error(`✗ no template for "${key}" (tried: ${candidates.join(' | ')})`)
  console.error(`  suggestions: ${suggestions.join(' · ') || '(none)'}`)
  process.exit(1)
}

// ---------- mapping helpers ----------
const parseSets = (s: string): { n: number; low: number; high: number | null } | null => {
  const m = s.match(/^(\d+)\s*×\s*(\d+)(?:–(\d+))?/)
  if (!m) return null
  return { n: +m[1], low: +m[2], high: m[3] ? +m[3] : null }
}

const startWeightKg = (ex: ExerciseId): number | null => {
  const row = loadsForExercise(ex)[0]
  if (!row) return null
  const m = row.current.match(/^([\d.]+)\s*kg/)
  return m ? +m[1] : null
}

const BARBELL = new Set<ExerciseId>(['bench-press', 'squat', 'barbell-row', 'overhead-press', 'rdl'])
const MID = new Set<ExerciseId>(['machine-overhead-press', 'lat-pulldown', 'seated-row', 'leg-press', 'incline-db-press'])
const restFor = (ex: ExerciseId): number => (BARBELL.has(ex) ? 120 : MID.has(ex) ? 90 : 60)

const mkSets = (n: number, low: number, high: number | null, weight: number | null): HevySet[] =>
  Array.from({ length: n }, () => ({
    type: 'normal',
    weight_kg: weight,
    reps: high ? null : low,
    rep_range: high ? { start: low, end: high } : null,
  }))

// ---------- build routines ----------
function buildExercises(items: DayItem[], T: (key: string) => { id: string; title: string }): HevyExercise[] {
  const out: HevyExercise[] = []
  let supersetCounter = 0

  for (const item of items) {
    if (item.ex) {
      const t = T(item.ex)
      const s = parseSets(item.sets)
      if (!s) throw new Error(`unparseable sets "${item.sets}" for ${item.ex}`)
      const notes = [item.star ? '★ weak-point priority' : null, item.hint ?? null].filter(Boolean).join(' · ') || null
      out.push({
        exercise_template_id: t.id,
        superset_id: null,
        rest_seconds: restFor(item.ex),
        notes,
        sets: mkSets(s.n, s.low, s.high, startWeightKg(item.ex)),
      })
      continue
    }
    // composite rows (hand-coded)
    const name = item.name ?? ''
    if (name.startsWith('Superset')) {
      const sid = supersetCounter++
      out.push(
        { exercise_template_id: T('cable-curl').id, superset_id: sid, rest_seconds: 60, notes: 'superset with pushdowns', sets: mkSets(3, 12, null, 7) },
        { exercise_template_id: T('triceps-pushdown').id, superset_id: sid, rest_seconds: 60, notes: 'superset with curls', sets: mkSets(3, 12, null, 9) },
      )
    } else if (name.startsWith('Arm Giant Set')) {
      const sid = supersetCounter++
      out.push(
        { exercise_template_id: T('db-curl').id, superset_id: sid, rest_seconds: 60, notes: 'giant set 1/3', sets: mkSets(3, 10, 12, 7) },
        { exercise_template_id: T('hammer-curl').id, superset_id: sid, rest_seconds: 60, notes: 'giant set 2/3', sets: mkSets(3, 10, 12, 7) },
        { exercise_template_id: T('overhead-triceps').id, superset_id: sid, rest_seconds: 60, notes: 'giant set 3/3', sets: mkSets(3, 10, 12, 7) },
      )
    } else if (name.startsWith('Core')) {
      out.push(
        { exercise_template_id: T('knee-raise').id, superset_id: null, rest_seconds: 60, notes: 'on the dip tower', sets: mkSets(3, 10, 15, null) },
        { exercise_template_id: T('cable-crunch').id, superset_id: null, rest_seconds: 60, notes: null, sets: mkSets(3, 10, 15, null) },
      )
    } else if (name.startsWith('Incline Chest Press')) {
      out.push({
        exercise_template_id: T('incline-db-press').id,
        superset_id: null,
        rest_seconds: 90,
        notes: item.hint ?? null,
        sets: mkSets(3, 8, 12, startWeightKg('incline-db-press')),
      })
    } else {
      throw new Error(`unhandled composite row: "${name}"`)
    }
  }
  return out
}

// ---------- main ----------
console.log(`${DRY ? '[DRY RUN] ' : ''}fetching Hevy exercise templates…`)
const templates = await fetchTemplates()
console.log(`  ${templates.size} templates loaded`)

const resolved = new Map<string, { id: string; title: string }>()
for (const [key, cands] of [...Object.entries(CANDIDATES), ...Object.entries(EXTRA_CANDIDATES)]) {
  resolved.set(key, resolveTemplate(key, cands, templates))
}
const T = (key: string) => resolved.get(key)!

console.log('\nresolved templates:')
for (const [key, t] of resolved) console.log(`  ${key.padEnd(24)} → ${t.title} (${t.id})`)

const routines: HevyRoutine[] = days.map((day) => ({
  title: day.name,
  folder_id: null,
  notes: day.focus,
  exercises: buildExercises(day.items, T),
}))

console.log('\nplanned routines:')
for (const r of routines) {
  console.log(`\n■ ${r.title} — ${r.notes}`)
  for (const e of r.exercises) {
    const t = [...resolved.values()].find((x) => x.id === e.exercise_template_id)
    const s0 = e.sets[0]
    const reps = s0.rep_range ? `${s0.rep_range.start}–${s0.rep_range.end}` : `${s0.reps}`
    const w = s0.weight_kg != null ? ` @ ${s0.weight_kg} kg` : ''
    const ss = e.superset_id != null ? ` [superset ${e.superset_id}]` : ''
    console.log(`   ${e.sets.length} × ${reps}${w} · rest ${e.rest_seconds}s · ${t?.title}${ss}${e.notes ? ` — ${e.notes}` : ''}`)
  }
}

if (DRY) {
  console.log('\n[DRY RUN] nothing written.')
  process.exit(0)
}

// folder
let folderId: number | null = null
const folders = await api('/routine_folders?page=1&pageSize=10')
const existing = (folders.routine_folders ?? []).find((f: any) => f.title === 'buff')
if (existing) {
  folderId = existing.id
  console.log(`\nfolder "buff" exists (id ${folderId})`)
} else {
  const created = await api('/routine_folders', { method: 'POST', body: JSON.stringify({ routine_folder: { title: 'buff' } }) })
  folderId = created.routine_folder?.id ?? null
  console.log(`\ncreated folder "buff" (id ${folderId})`)
}

// idempotency
const existingRoutines = await api('/routines?page=1&pageSize=10')
const existingTitles = new Set((existingRoutines.routines ?? []).map((r: any) => r.title))

for (const r of routines) {
  if (existingTitles.has(r.title)) {
    console.log(`↷ "${r.title}" already exists — skipped`)
    continue
  }
  r.folder_id = folderId
  try {
    await api('/routines', { method: 'POST', body: JSON.stringify({ routine: r }) })
    console.log(`✓ created "${r.title}" (${r.exercises.length} exercises)`)
  } catch (err) {
    // fallback: some deployments may reject rep_range — retry with plain reps
    if (String(err).includes('rep_range') || String(err).includes('400')) {
      console.log(`  rep_range rejected for "${r.title}" — retrying with plain reps`)
      for (const e of r.exercises)
        for (const s of e.sets)
          if (s.rep_range) {
            s.reps = s.rep_range.start
            s.rep_range = null
          }
      await api('/routines', { method: 'POST', body: JSON.stringify({ routine: r }) })
      console.log(`✓ created "${r.title}" (plain reps fallback)`)
    } else {
      throw err
    }
  }
}

console.log('\ndone — open Hevy and check the "buff" folder 💪')
