export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex"
    }
  })

export const methodNotAllowed = (allow: string) =>
  new Response(null, { status: 405, headers: { Allow: allow } })
