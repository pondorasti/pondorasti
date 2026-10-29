import { Client, InMemoryTransport } from "@modelcontextprotocol/client"
import { McpServer } from "@modelcontextprotocol/server"
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test"
import { registerHevy } from "./hevy"

let client: Client
let server: McpServer
let request: ReturnType<typeof vi.fn<typeof fetch>>

beforeEach(async () => {
  request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ routine: { id: "r1" } }))
  vi.stubGlobal("fetch", request)
  server = new McpServer({ name: "hevy-test", version: "1.0.0" })
  registerHevy(server, { HEVY_API_KEY: "hevy-test-key" })
  client = new Client({ name: "test", version: "1.0.0" })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
})

afterEach(async () => {
  await client.close()
  await server.close()
  vi.unstubAllGlobals()
})

const sentBody = (n = 0) => JSON.parse(request.mock.calls[n][1]?.body as string)

const exercises = [
  {
    exercise_template_id: "D04AC939",
    rest_seconds: 90,
    sets: [
      { type: "warmup", weight_kg: 40, reps: 10, rep_range: null, duration_seconds: null },
      { weight_kg: 80, rep_range: { start: 8, end: 12 } },
      { duration_seconds: 60 }
    ]
  }
]

test("reads keep sending GET with only the api key", async () => {
  await client.callTool({ name: "hevy_list_routines", arguments: {} })
  const [url, init] = request.mock.calls[0]
  expect((url as URL).href).toBe("https://api.hevyapp.com/v1/routines?page=1&pageSize=10")
  expect(init).toMatchObject({ method: "GET", headers: { "api-key": "hevy-test-key" } })
  expect(init?.body).toBeUndefined()
})

test("update omits null optional set fields that Hevy's PUT rejects", async () => {
  const result = await client.callTool({
    name: "hevy_update_routine",
    arguments: { routineId: "abc/def", title: "Push", exercises }
  })
  expect(result.isError).not.toBe(true)
  const [url, init] = request.mock.calls[0]
  expect((url as URL).href).toBe("https://api.hevyapp.com/v1/routines/abc%2Fdef")
  expect(init).toMatchObject({
    method: "PUT",
    headers: { "api-key": "hevy-test-key", "Content-Type": "application/json" }
  })
  expect(sentBody()).toEqual({
    routine: {
      title: "Push",
      notes: "",
      exercises: [
        {
          exercise_template_id: "D04AC939",
          superset_id: null,
          rest_seconds: 90,
          notes: null,
          sets: [
            { type: "warmup", weight_kg: 40, reps: 10 },
            { type: "normal", weight_kg: 80, reps: null, rep_range: { start: 8, end: 12 } },
            { type: "normal", weight_kg: null, reps: null, duration_seconds: 60 }
          ]
        }
      ]
    }
  })
})

test("create posts the routine with folder_id defaulting to My Routines", async () => {
  await client.callTool({
    name: "hevy_create_routine",
    arguments: { title: "Pull", notes: "Week 1", exercises }
  })
  expect(request.mock.calls[0][1]?.method).toBe("POST")
  expect(sentBody().routine).toMatchObject({ title: "Pull", folder_id: null, notes: "Week 1" })
  expect(Object.keys(sentBody().routine)).not.toContain("routineId")
})

test("folders and custom exercises post the bodies Hevy expects", async () => {
  await client.callTool({ name: "hevy_create_routine_folder", arguments: { title: "Block 1" } })
  await client.callTool({
    name: "hevy_create_exercise_template",
    arguments: {
      title: "Banded Face Pull",
      exercise_type: "reps_only",
      equipment_category: "resistance_band",
      muscle_group: "shoulders"
    }
  })
  expect((request.mock.calls[0][0] as URL).href).toBe("https://api.hevyapp.com/v1/routine_folders")
  expect(sentBody(0)).toEqual({ routine_folder: { title: "Block 1" } })
  expect((request.mock.calls[1][0] as URL).href).toBe(
    "https://api.hevyapp.com/v1/exercise_templates"
  )
  expect(sentBody(1)).toEqual({
    exercise: {
      title: "Banded Face Pull",
      exercise_type: "reps_only",
      equipment_category: "resistance_band",
      muscle_group: "shoulders",
      other_muscles: []
    }
  })
})

test("invalid routines are rejected before reaching Hevy", async () => {
  const result = await client.callTool({
    name: "hevy_create_routine",
    arguments: { title: "Empty", exercises: [{ exercise_template_id: "X", sets: [] }] }
  })
  expect(result.isError).toBe(true)
  expect(request).not.toHaveBeenCalled()
})

test("write tools are annotated as writes", async () => {
  const { tools } = await client.listTools()
  const hints = Object.fromEntries(tools.map((t) => [t.name, t.annotations]))
  for (const name of [
    "hevy_create_routine",
    "hevy_update_routine",
    "hevy_create_routine_folder",
    "hevy_create_exercise_template"
  ]) {
    expect(hints[name]?.readOnlyHint).toBe(false)
  }
  expect(hints.hevy_update_routine).toMatchObject({ idempotentHint: true })
  expect(hints.hevy_create_routine).toMatchObject({ destructiveHint: false })
  expect(hints.hevy_get_routine).toMatchObject({ readOnlyHint: true })
})
