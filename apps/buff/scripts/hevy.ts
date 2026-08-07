/**
 * Shared Hevy API client for the buff scripts (import, sync, ad-hoc edits).
 * Run scripts from the repo root so bun auto-loads .env (HEVY_API_KEY).
 */

const API = 'https://api.hevyapp.com/v1'
const KEY = process.env.HEVY_API_KEY

if (!KEY) {
  console.error('✗ HEVY_API_KEY not set — run from repo root so bun loads .env')
  process.exit(1)
}

// ---------- request types ----------
export interface HevySet {
  type: 'normal' | 'warmup' | 'failure' | 'dropset'
  weight_kg: number | null
  reps: number | null
  rep_range?: { start: number; end: number } | null
  duration_seconds?: number | null
}
export interface HevyExercise {
  exercise_template_id: string
  superset_id: number | null
  rest_seconds: number | null
  notes: string | null
  sets: HevySet[]
}
export interface HevyRoutine {
  title: string
  folder_id?: number | null
  notes: string
  exercises: HevyExercise[]
}
export interface HevyTemplate {
  id: string
  title: string
}

/** Authenticated fetch; throws with the response body on non-2xx. */
export async function hevy(path: string, init?: RequestInit): Promise<any> {
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

/** Generic paginator. Hevy caps pageSize at 10 for routines/workouts, 100 for templates. */
async function paginate<T>(path: string, key: string, pageSize: number): Promise<T[]> {
  const out: T[] = []
  let page = 1
  for (;;) {
    const d = await hevy(`${path}?page=${page}&pageSize=${pageSize}`)
    out.push(...((d[key] ?? []) as T[]))
    if (page >= (d.page_count ?? 1)) return out
    page++
  }
}

export const getAllRoutines = () => paginate<any>('/routines', 'routines', 10)
export const getAllWorkouts = () => paginate<any>('/workouts', 'workouts', 10)

/** All exercise templates as a case-insensitive title → template map. */
export async function getTemplatesByTitle(): Promise<Map<string, HevyTemplate>> {
  const list = await paginate<any>('/exercise_templates', 'exercise_templates', 100)
  return new Map(list.map((t) => [t.title.toLowerCase(), { id: t.id, title: t.title }]))
}

/**
 * Serialize a routine's exercises for PUT /v1/routines/{id}.
 *
 * QUIRK (learned the hard way): POST accepts `rep_range: null`, but PUT
 * rejects it with "Expected object, received null" — the key must be
 * OMITTED when there is no range. Same for duration_seconds.
 */
export function cleanExercisesForPut(exercises: any[]): HevyExercise[] {
  return exercises.map((e) => ({
    exercise_template_id: e.exercise_template_id,
    superset_id: e.superset_id ?? null,
    rest_seconds: e.rest_seconds ?? null,
    notes: e.notes ?? null,
    sets: e.sets.map((s: any) => {
      const set: HevySet = {
        type: s.type ?? 'normal',
        weight_kg: s.weight_kg ?? null,
        reps: s.reps ?? null,
      }
      if (s.rep_range) set.rep_range = s.rep_range
      if (s.duration_seconds != null) set.duration_seconds = s.duration_seconds
      return set
    }),
  }))
}
