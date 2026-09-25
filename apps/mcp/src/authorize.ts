import {
  AuthorizationError,
  CimdFetchError,
  type AuthRequest,
  type ClientInfo
} from "@cloudflare/workers-oauth-provider"
import { checkPassword, escape, field, html, STYLE, text } from "./login"
import { SCOPE } from "./mcp"

const USER_ID = "alexandru"

/**
 * GET shows who is asking and where tokens will go; POST checks the password and
 * approves. The library keeps the request server-side between the two, so the form
 * carries only a single-use, browser-bound handle (its CSRF protection).
 */
export async function authorize(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER
  try {
    if (request.method === "GET") {
      const authRequest = await oauth.parseAuthRequest(request)
      const client = await oauth.lookupClient(authRequest.clientId)
      if (!client) return text("Unknown OAuth client", 400)
      const consent = await oauth.beginConsent(authRequest)
      return html(page(client, authRequest, consent.handle), consent.headers)
    }
    if (request.method !== "POST") return text("Method not allowed", 405)

    const form = await request.formData()
    const handle = field(form, "handle")
    if (form.get("decision") !== "approve") {
      const denied = await oauth.denyConsent(request, handle)
      return new Response(null, { status: 302, headers: denied.headers })
    }

    const rejected = await checkPassword(request, form, env)
    if (rejected) return rejected

    const approved = await oauth.approveConsent(request, handle, { scope: [SCOPE] })
    const { redirectTo } = await oauth.completeAuthorization({
      request: approved.request,
      userId: USER_ID,
      metadata: {},
      scope: [SCOPE],
      props: { userId: USER_ID }
    })
    approved.headers.set("Location", redirectTo)
    return new Response(null, { status: 302, headers: approved.headers })
  } catch (error) {
    if (error instanceof AuthorizationError && error.redirectUri) {
      const redirect = new URL(error.redirectUri)
      redirect.searchParams.set("error", error.code)
      redirect.searchParams.set("error_description", error.description)
      if (error.state) redirect.searchParams.set("state", error.state)
      if (error.issuer) redirect.searchParams.set("iss", error.issuer)
      return Response.redirect(redirect.href, 302)
    }
    if (error instanceof AuthorizationError) return text(error.description, 400)
    if (error instanceof CimdFetchError) return text("This app could not be verified.", 400)
    throw error
  }
}

function page(client: ClientInfo, request: AuthRequest, handle: string) {
  const name = escape(client.clientName ?? client.clientId)
  const redirectHost = escape(new URL(request.redirectUri).hostname)
  const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/.test(
    new URL(request.redirectUri).hostname
  )
  const publisher = client.clientId.startsWith("https://")
    ? `Published by <b>${escape(new URL(client.clientId).hostname)}</b>.`
    : "This app registered itself; its name is not verified."
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect ${name}</title>
${STYLE}
<h1>Connect ${name} to mcp.alexandru.so?</h1>
<p>${publisher} Access tokens will be sent to <b>${redirectHost}</b>.</p>
${local ? '<p class="warn">This sends access to an app on your computer. Continue only if you just started connecting from it.</p>' : ""}
<form method="post">
  <input type="hidden" name="handle" value="${escape(handle)}">
  <label>Password<input type="password" name="password" autocomplete="current-password" autofocus></label>
  <div class="row">
    <button name="decision" value="deny" formnovalidate>Deny</button>
    <button name="decision" value="approve">Allow</button>
  </div>
</form>
</html>`
}
