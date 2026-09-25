import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { type ToolResult, json, toolError } from "./result"

const API = "https://api.hevyapp.com/v1"
const readOnly = { readOnlyHint: true, openWorldHint: true } as const

const page = z.number().int().min(1).default(1).describe("1-based page number")
const id = z.string().min(1)

type TemplatePage = { page_count: number; exercise_templates: { title: string }[] }

/** Hevy's API key belongs to one account, so every tool reads that account's data. */
export function registerHevy(server: McpServer, env: Env) {
  async function hevy<T = unknown>(
    path: string,
    query: Record<string, string | number | undefined> = {}
  ): Promise<T> {
    const url = new URL(`${API}${path}`)
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const res = await fetch(url, { headers: { "api-key": env.HEVY_API_KEY } })
    if (!res.ok) throw new Error(`Hevy ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return res.json<T>()
  }

  const call =
    <A>(fn: (args: A) => Promise<unknown>) =>
    async (args: A): Promise<ToolResult> => {
      try {
        return json(await fn(args))
      } catch (error) {
        return toolError(error)
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
    call(({ page, pageSize }) => hevy("/workouts", { page, pageSize }))
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
    call(({ page }) => hevy("/routines", { page, pageSize: 10 }))
  )

  server.registerTool(
    "hevy_search_exercises",
    {
      title: "Search Hevy exercises",
      description:
        "Find exercise templates by name (case-insensitive substring, e.g. 'bench', 'row'). " +
        "Returns template ids for hevy_get_exercise_history.",
      inputSchema: z.object({ query: z.string().min(1) }),
      annotations: readOnly
    },
    call(async ({ query }) => {
      const needle = query.toLowerCase()
      const matches: unknown[] = []
      for (let p = 1, pageCount = 1; p <= pageCount; p++) {
        const data = await hevy<TemplatePage>("/exercise_templates", { page: p, pageSize: 100 })
        pageCount = data.page_count ?? 1
        for (const t of data.exercise_templates) {
          if (t.title.toLowerCase().includes(needle)) matches.push(t)
        }
      }
      return { exercise_templates: matches }
    })
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
        start_date: startDate,
        end_date: endDate
      })
    )
  )
}
