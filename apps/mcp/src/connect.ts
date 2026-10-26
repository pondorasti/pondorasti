import { finishGoogleSignIn, isGoogleConnected, startGoogleSignIn } from "./connectors/google"
import { getSession, rejectForeignPost, type Session } from "./auth"
import { KvOAuthProvider, UPSTREAMS, authorizeUpstream, isUpstreamId } from "./connectors/upstream"
import { STYLE, escape, html, text } from "./login"

/**
 * Links the gateway to an account, for proxied MCP upstreams (yc) and for
 * Google (gmail_* and calendar_* tools):
 *   GET  /connect/<id>           Google sign-in or connection form
 *   POST /connect/<id>           owner session → redirect to the provider's sign-in
 *   GET  /connect/<id>/callback  exchange the code, store tokens in KV
 */
export async function connect(request: Request, env: Env): Promise<Response | undefined> {
  const match = new URL(request.url).pathname.match(/^\/connect\/([a-z]+)(\/callback)?$/)
  if (!match) return undefined
  const [, id, callback] = match
  if (id === "notion") {
    return html(
      page(
        "Notion page access",
        `<p>Notion uses the gateway's internal integration.</p>
<p>Open <a href="https://app.notion.com/developers/connections">Notion connections</a>,
choose <b>mcp.alexandru.so</b>, then <b>Content access → Edit access</b> to choose pages.
Sharing a parent page includes its child pages.</p>`
      )
    )
  }
  if (id !== "google" && !isUpstreamId(id)) return text("Unknown connector", 404)
  if (request.method !== "GET" && request.method !== "POST") return text("Method not allowed", 405)
  const rejected = rejectForeignPost(request, env)
  if (rejected) return rejected
  const session = await getSession(request, env)
  if (!session) {
    if (callback || request.method === "POST")
      return text("Sign in with Google and restart the connection.", 401)
    return connectForm(
      id === "google" ? "Google" : UPSTREAMS[id].name,
      id === "google" ? "gmail_* and calendar_*" : `${id}_*`,
      false,
      undefined,
      `/connect/${id}`
    )
  }
  if (callback && request.method !== "GET") return text("Method not allowed", 405)
  if (id === "google") return connectGoogle(request, env, Boolean(callback), session)
  const { name } = UPSTREAMS[id]
  const provider = new KvOAuthProvider(id, env)

  if (callback) {
    const params = new URL(request.url).searchParams
    if (!(await provider.consumeState(params.get("state") ?? ""))) {
      return text("This sign-in link expired or was already used. Start again.", 400)
    }
    const error = params.get("error")
    if (error) return text(`${name} sign-in failed: ${error}`, 400)
    await authorizeUpstream(id, provider, {
      code: params.get("code") ?? "",
      iss: params.get("iss") ?? undefined
    })
    return html(
      page(`${escape(name)} connected`, `<p>Its tools now show up as <b>${id}_*</b>.</p>`)
    )
  }

  if (request.method === "POST") {
    await provider.invalidateCredentials("tokens")
    const result = await authorizeUpstream(id, provider)
    if (result === "REDIRECT" && provider.authorizationUrl) {
      return Response.redirect(provider.authorizationUrl.href, 302)
    }
    return text(`${name} did not ask for sign-in (${result}).`, 502)
  }

  return connectForm(
    name,
    `${id}_*`,
    (await provider.tokens()) !== undefined,
    session,
    `/connect/${id}`
  )
}

async function connectGoogle(request: Request, env: Env, callback: boolean, session: Session) {
  if (callback) {
    try {
      await finishGoogleSignIn(env, new URL(request.url).searchParams)
    } catch (error) {
      return text(`${error instanceof Error ? error.message : String(error)} Start again.`, 400)
    }
    return html(
      page(
        "Google connected",
        "<p>Its tools now show up as <b>gmail_*</b> and <b>calendar_*</b>.</p>"
      )
    )
  }
  if (request.method === "POST") {
    return Response.redirect((await startGoogleSignIn(env)).href, 302)
  }
  return connectForm(
    "Google",
    "gmail_* and calendar_*",
    await isGoogleConnected(env),
    session,
    "/connect/google"
  )
}

function connectForm(
  name: string,
  tools: string,
  connected: boolean,
  session: Session | undefined,
  returnTo: string
) {
  return html(
    page(
      `${connected ? "Reconnect" : "Connect"} ${escape(name)}`,
      `<p>Signs the gateway into ${escape(name)} so its tools appear as <b>${escape(tools)}</b>.</p>
<form method="post">
  <input type="hidden" name="returnTo" value="${escape(returnTo)}">
  ${session ? `<p>Signed in as <b>${escape(session.email)}</b>.</p>` : "<p>Sign in with Google to manage this connection.</p>"}
  <div class="row">${session ? `<button value="approve">Continue to ${escape(name)}</button>` : '<button formaction="/login/google" value="approve">Continue with Google</button>'}</div>
</form>`
    )
  )
}

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${STYLE}
<h1>${title}</h1>
${body}
</html>`
}
