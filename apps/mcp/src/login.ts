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
  headers.set("Cache-Control", "no-store")
  // Preserve Origin on our form posts while suppressing cross-origin referrers.
  headers.set("Referrer-Policy", "same-origin")
  return new Response(body, { status, headers })
}

export function text(body: string, status: number) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
