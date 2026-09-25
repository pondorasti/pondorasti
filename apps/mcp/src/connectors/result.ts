export type ToolResult = {
  content: { type: "text"; text: string }[]
  isError?: boolean
}

/** Compact JSON with nulls dropped; upstream APIs pad every set with null fields. */
export function json(data: unknown): ToolResult {
  const text = JSON.stringify(data, (_key, value) => (value === null ? undefined : value))
  return { content: [{ type: "text", text }] }
}

/** Errors go back to the model as a tool result so it can retry or explain. */
export function toolError(error: unknown): ToolResult {
  const text = error instanceof Error ? error.message : String(error)
  return { content: [{ type: "text", text }], isError: true }
}
