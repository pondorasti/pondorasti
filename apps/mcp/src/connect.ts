import { KvOAuthProvider, UPSTREAMS, authorizeUpstream, isUpstreamId } from "./connectors/upstream"
import { STYLE, checkPassword, escape, html, text } from "./login"

/**
 * Links the gateway to an upstream account:
 *   GET  /connect/<id>           password form
 *   POST /connect/<id>           password ok → redirect to the upstream's sign-in
 *   GET  /connect/<id>/callback  exchange the code, store tokens in KV
 */
export async function connect(request: Request, env: Env): Promise<Response | undefined> {
  const match = new URL(request.url).pathname.match(/^\/connect\/([a-z]+)(\/callback)?$/)
  if (!match) return undefined
  const [, id, callback] = match
  if (!isUpstreamId(id)) return text("Unknown connector", 404)
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
    const rejected = await checkPassword(request, await request.formData(), env)
    if (rejected) return rejected
    await provider.invalidateCredentials("tokens")
    const result = await authorizeUpstream(id, provider)
    if (result === "REDIRECT" && provider.authorizationUrl) {
      return Response.redirect(provider.authorizationUrl.href, 302)
    }
    return text(`${name} did not ask for sign-in (${result}).`, 502)
  }

  const connected = (await provider.tokens()) !== undefined
  return html(
    page(
      `${connected ? "Reconnect" : "Connect"} ${escape(name)}`,
      `<p>Signs the gateway into ${escape(name)} so its tools appear as <b>${id}_*</b>.</p>
<form method="post">
  <label>Password<input type="password" name="password" autocomplete="current-password" autofocus></label>
  <div class="row"><button value="approve">Continue to ${escape(name)}</button></div>
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
