/** The one password that gates both client consent and linking upstream accounts. */
export async function checkPassword(request: Request, form: FormData, env: Env) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown"
  if (!(await env.LOGIN_LIMITER.limit({ key: ip })).success) {
    return text("Too many attempts. Wait a minute, then go back and retry.", 429)
  }
  if (!(await passwordMatches(field(form, "password"), env.LOGIN_PASSWORD))) {
    return text("Wrong password. Go back and retry.", 401)
  }
  return undefined
}

async function passwordMatches(given: string, expected: string) {
  if (!expected) return false
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all(
    [given, expected].map((value) => crypto.subtle.digest("SHA-256", encoder.encode(value)))
  )
  return crypto.subtle.timingSafeEqual(a, b)
}

export function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

export const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export const STYLE = `<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { max-width: 26rem; margin: 12vh auto; padding: 0 1.25rem; line-height: 1.5; }
  h1 { font-size: 1.25rem; }
  .warn { padding: .75rem; border-radius: .5rem; background: #f59e0b22; }
  input, button { font: inherit; padding: .6rem .8rem; border-radius: .5rem; border: 1px solid #8886; }
  input { width: 100%; box-sizing: border-box; margin: .5rem 0 1rem; }
  .row { display: flex; gap: .5rem; }
  button { flex: 1; cursor: pointer; }
  button[value=approve] { background: CanvasText; color: Canvas; }
</style>`

export function html(body: string, headers = new Headers(), status = 200) {
  headers.set("Content-Type", "text/html; charset=utf-8")
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"
  )
  return new Response(body, { status, headers })
}

export function text(body: string, status: number) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
