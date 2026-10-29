import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { call } from "./result"

const API = "https://api.hevyapp.com/v1"
const readOnly = { readOnlyHint: true, openWorldHint: true } as const
const create = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
} as const
/** PUT replaces the routine's title, notes and exercises wholesale. */
const replace = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true
} as const

const page = z.number().int().min(1).default(1).describe("1-based page number")
const id = z.string().min(1)
const count = z.number().int().min(0)

const set = z.object({
  type: z.enum(["normal", "warmup", "failure", "dropset"]).default("normal"),
  weight_kg: z
    .number()
    .min(0)
    .nullable()
    .default(null)
    .describe("Planned load in kg; null for bodyweight"),
  reps: count.nullable().default(null).describe("Fixed rep target; null when using rep_range"),
  rep_range: z
    .object({ start: count, end: count })
    .refine((range) => range.start <= range.end, "rep_range start must not exceed end")
    .nullish()
    .describe("Rep target range, e.g. { start: 8, end: 12 }"),
  duration_seconds: count.nullish().describe("For timed sets (planks, carries)"),
  distance_meters: count.nullish().describe("For distance sets (rows, runs)")
})

const exercise = z.object({
  exercise_template_id: id.describe("Template id from hevy_search_exercises"),
  superset_id: count.nullable().default(null).describe("Exercises sharing an id form a superset"),
  rest_seconds: count.nullable().default(null).describe("Rest after each set"),
  notes: z.string().nullable().default(null).describe("Coaching cues shown with the exercise"),
  sets: z.array(set).min(1)
})

const exercises = z
  .array(exercise)
  .min(1)
  .describe("In order. Each set is planned individually, so 3x10 is three sets.")

const muscle = z.enum([
  "abdominals",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "calves",
  "glutes",
  "abductors",
  "adductors",
  "lats",
  "upper_back",
  "traps",
  "lower_back",
  "chest",
  "cardio",
  "neck",
  "full_body",
  "other"
])

type TemplatePage = { page_count: number; exercise_templates: { title: string }[] }
type Request = {
  method?: "GET" | "POST" | "PUT"
  query?: Record<string, string | number | undefined>
  body?: unknown
}

/**
 * Hevy's PUT rejects `rep_range: null` and `duration_seconds: null` (POST accepts them),
 * so optional set fields are omitted rather than sent as null.
 */
function toRequestExercises(list: z.infer<typeof exercises>) {
  return list.map(({ sets, ...rest }) => ({
    ...rest,
    sets: sets.map(({ rep_range, duration_seconds, distance_meters, ...set }) => ({
      ...set,
      ...(rep_range != null && { rep_range }),
      ...(duration_seconds != null && { duration_seconds }),
      ...(distance_meters != null && { distance_meters })
    }))
  }))
}

/** Hevy's API key belongs to one account, so every tool reads and writes that account's data. */
export function registerHevy(server: McpServer, env: Pick<Env, "HEVY_API_KEY">) {
  async function hevy<T = unknown>(
    path: string,
    { method = "GET", query = {}, body }: Request = {}
  ): Promise<T> {
    const url = new URL(`${API}${path}`)
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const headers: Record<string, string> = { "api-key": env.HEVY_API_KEY }
    if (body !== undefined) headers["Content-Type"] = "application/json"
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(30_000)
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Hevy ${res.status}: ${text.slice(0, 300)}`)
    // A write that succeeded must not read as an error, or the model retries and duplicates it.
    try {
      return JSON.parse(text) as T
    } catch {
      return { status: res.status, body: text } as T
    }
  }

  server.registerTool(
    "hevy_list_workouts",
    {
      title: "List Hevy workouts",
      description:
        "Logged workouts, newest first, with every exercise and set (weights in kg). " +
        "Response includes page_count for paging further back.",
      inputSchema: z.object({
        page,
        pageSize: z.number().int().min(1).max(10).default(5).describe("Workouts per page (max 10)")
      }),
      annotations: readOnly
    },
    call(({ page, pageSize }) => hevy("/workouts", { query: { page, pageSize } }))
  )

  server.registerTool(
    "hevy_get_workout",
    {
      title: "Get Hevy workout",
      description: "One logged workout by id, with every exercise and set.",
      inputSchema: z.object({ workoutId: id }),
      annotations: readOnly
    },
    call(({ workoutId }) => hevy(`/workouts/${encodeURIComponent(workoutId)}`))
  )

  server.registerTool(
    "hevy_list_routines",
    {
      title: "List Hevy routines",
      description: "Saved routines (workout templates) with their planned exercises and sets.",
      inputSchema: z.object({ page }),
      annotations: readOnly
    },
    call(({ page }) => hevy("/routines", { query: { page, pageSize: 10 } }))
  )

  server.registerTool(
    "hevy_get_routine",
    {
      title: "Get Hevy routine",
      description:
        "One routine by id, with its planned exercises and sets (weights in kg). " +
        "Read it before hevy_update_routine, which replaces the whole routine.",
      inputSchema: z.object({ routineId: id }),
      annotations: readOnly
    },
    call(({ routineId }) => hevy(`/routines/${encodeURIComponent(routineId)}`))
  )

  server.registerTool(
    "hevy_create_routine",
    {
      title: "Create Hevy routine",
      description:
        "Save a new routine (workout template). Find exercise_template_id values with " +
        "hevy_search_exercises and folder ids with hevy_list_routine_folders. Weights in kg.",
      inputSchema: z.object({
        title: z.string().min(1),
        folder_id: z
          .number()
          .int()
          .nullable()
          .default(null)
          .describe("Routine folder id; null puts it in the default 'My Routines' folder"),
        notes: z.string().default("").describe("Notes for the whole routine"),
        exercises
      }),
      annotations: create
    },
    call(({ title, folder_id, notes, exercises }) =>
      hevy("/routines", {
        method: "POST",
        body: { routine: { title, folder_id, notes, exercises: toRequestExercises(exercises) } }
      })
    )
  )

  server.registerTool(
    "hevy_update_routine",
    {
      title: "Update Hevy routine",
      description:
        "Replace a routine's title, notes and exercises. Not a patch: anything left out is " +
        "removed, so start from hevy_get_routine and send the full exercise list. Weights in kg.",
      inputSchema: z.object({
        routineId: id,
        title: z.string().min(1),
        notes: z.string().default("").describe("Notes for the whole routine"),
        exercises
      }),
      annotations: replace
    },
    call(({ routineId, title, notes, exercises }) =>
      hevy(`/routines/${encodeURIComponent(routineId)}`, {
        method: "PUT",
        body: { routine: { title, notes, exercises: toRequestExercises(exercises) } }
      })
    )
  )

  server.registerTool(
    "hevy_list_routine_folders",
    {
      title: "List Hevy routine folders",
      description:
        "Routine folders in display order. Use an id as folder_id in hevy_create_routine.",
      inputSchema: z.object({ page }),
      annotations: readOnly
    },
    call(({ page }) => hevy("/routine_folders", { query: { page, pageSize: 10 } }))
  )

  server.registerTool(
    "hevy_create_routine_folder",
    {
      title: "Create Hevy routine folder",
      description:
        "Create a routine folder (e.g. a training block). New folders appear first in the list. " +
        "Check hevy_list_routine_folders before creating a duplicate.",
      inputSchema: z.object({ title: z.string().min(1) }),
      annotations: create
    },
    call(({ title }) =>
      hevy("/routine_folders", { method: "POST", body: { routine_folder: { title } } })
    )
  )

  server.registerTool(
    "hevy_search_exercises",
    {
      title: "Search Hevy exercises",
      description:
        "Find exercise templates by name (case-insensitive substring, e.g. 'bench', 'row'). " +
        "Returns template ids for routines and hevy_get_exercise_history.",
      inputSchema: z.object({ query: z.string().min(1) }),
      annotations: readOnly
    },
    call(async ({ query }) => {
      const needle = query.toLowerCase()
      const matches: unknown[] = []
      for (let p = 1, pageCount = 1; p <= pageCount; p++) {
        const data = await hevy<TemplatePage>("/exercise_templates", {
          query: { page: p, pageSize: 100 }
        })
        pageCount = data.page_count ?? 1
        for (const t of data.exercise_templates) {
          if (t.title.toLowerCase().includes(needle)) matches.push(t)
        }
      }
      return { exercise_templates: matches }
    })
  )

  server.registerTool(
    "hevy_create_exercise_template",
    {
      title: "Create Hevy custom exercise",
      description:
        "Add a custom exercise Hevy's library lacks. Search with hevy_search_exercises first: " +
        "custom exercises count against an account limit and duplicates are not detected.",
      inputSchema: z.object({
        title: z.string().min(1),
        exercise_type: z
          .enum([
            "weight_reps",
            "reps_only",
            "bodyweight_reps",
            "bodyweight_assisted_reps",
            "duration",
            "weight_duration",
            "distance_duration",
            "short_distance_weight"
          ])
          .describe("Which set fields the exercise tracks"),
        equipment_category: z.enum([
          "none",
          "barbell",
          "dumbbell",
          "kettlebell",
          "machine",
          "plate",
          "resistance_band",
          "suspension",
          "other"
        ]),
        muscle_group: muscle.describe("Primary muscle group"),
        other_muscles: z.array(muscle).default([]).describe("Secondary muscle groups")
      }),
      annotations: create
    },
    call((exercise) => hevy("/exercise_templates", { method: "POST", body: { exercise } }))
  )

  server.registerTool(
    "hevy_get_exercise_history",
    {
      title: "Get Hevy exercise history",
      description:
        "Every logged set of one exercise across workouts, newest first. Use for progress " +
        "questions (top weight, volume, PRs). Get the id from hevy_search_exercises.",
      inputSchema: z.object({
        exerciseTemplateId: id,
        startDate: z.iso.datetime({ offset: true }).optional().describe("ISO 8601, inclusive"),
        endDate: z.iso.datetime({ offset: true }).optional().describe("ISO 8601, inclusive")
      }),
      annotations: readOnly
    },
    call(({ exerciseTemplateId, startDate, endDate }) =>
      hevy(`/exercise_history/${encodeURIComponent(exerciseTemplateId)}`, {
        query: { start_date: startDate, end_date: endDate }
      })
    )
  )
}
