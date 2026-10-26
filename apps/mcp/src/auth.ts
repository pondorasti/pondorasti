import { createRemoteJWKSet, jwtVerify } from "jose"
import { field, text } from "./login"

const FLOW_TTL = 10 * 60
const SESSION_TTL = 8 * 60 * 60
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))
const returnPaths = new Set([
  "/",
  "/authorize",
  "/connect/google",
  "/connect/yc",
  "/connect/robinhood",
  "/connect/notion"
])

type Flow = {
  browserHash: string
  verifier: string
  nonce: string
  returnTo: string
  expiresAt: number
}

export type Session = { email: string; sub: string; expiresAt: number }

const prefix = (env: Env) =>
  new URL(env.PUBLIC_ORIGIN).protocol === "https:" ? "__Host-mcp_" : "mcp_"
const callbackUri = (env: Env) => `${env.PUBLIC_ORIGIN}/login/google/callback`
const base64url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)))
const hash = async (value: string) =>
  base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))

function cookie(env: Env, name: string, value: string, maxAge: number) {
  return `${prefix(env)}${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(env.PUBLIC_ORIGIN).protocol === "https:" ? "; Secure" : ""}`
}

function cookieValue(request: Request, env: Env, name: string) {
  const matches = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${prefix(env)}${name}=`))
  return matches.length === 1 ? matches[0].slice(`${prefix(env)}${name}=`.length) : undefined
}

/** Browser mutations must come from a form on this gateway, including sibling subdomains. */
export function rejectForeignPost(request: Request, env: Env): Response | undefined {
  if (
    request.method === "POST" &&
    request.headers.get("Origin") !== new URL(env.PUBLIC_ORIGIN).origin
  ) {
    return text("Submit this form from the gateway page.", 403)
  }
}

export async function getSession(request: Request, env: Env): Promise<Session | undefined> {
  const token = cookieValue(request, env, "session")
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return
  const session = await env.OAUTH_KV.get<Session>(`login:session:${await hash(token)}`, "json")
  if (
    !session ||
    session.expiresAt <= Date.now() ||
    session.email !== env.LOGIN_GOOGLE_EMAIL.toLowerCase()
  )
    return
  return session
}

/** Login URLs can only return to our own consent or account-linking pages. */
function returnPath(value: string, env: Env) {
  try {
    const url = new URL(value, env.PUBLIC_ORIGIN)
    if (
      url.origin !== new URL(env.PUBLIC_ORIGIN).origin ||
      url.hash ||
      !returnPaths.has(url.pathname)
    )
      return
    return url.pathname + url.search
  } catch {
    return undefined
  }
}

export async function startLogin(request: Request, env: Env) {
  if (request.method !== "POST") return text("Method not allowed", 405)
  const rejected = rejectForeignPost(request, env)
  if (rejected) return rejected
  if (
    !(await env.LOGIN_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" }))
      .success
  ) {
    return text("Too many sign-in attempts. Try again in a minute.", 429)
  }
  const form = await request.formData()
  const returnTo = returnPath(field(form, "returnTo") || "/", env)
  if (!returnTo) return text("Invalid sign-in return URL.", 400)

  const state = crypto.randomUUID()
  const browser = random()
  const flow: Flow = {
    browserHash: await hash(browser),
    verifier: random(),
    nonce: random(),
    returnTo,
    expiresAt: Date.now() + FLOW_TTL * 1000
  }
  await env.OAUTH_KV.put(`login:flow:${state}`, JSON.stringify(flow), { expirationTtl: FLOW_TTL })
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUri(env),
    response_type: "code",
    scope: "openid email",
    prompt: "select_account",
    login_hint: env.LOGIN_GOOGLE_EMAIL,
    state,
    nonce: flow.nonce,
    code_challenge: await hash(flow.verifier),
    code_challenge_method: "S256"
  }).toString()
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      "Set-Cookie": cookie(env, `login_${state}`, browser, FLOW_TTL),
      "Cache-Control": "no-store"
    }
  })
}

export async function finishLogin(request: Request, env: Env) {
  if (request.method !== "GET") return text("Method not allowed", 405)
  const params = new URL(request.url).searchParams
  const state = params.get("state") ?? ""
  if (!/^[0-9a-f-]{36}$/.test(state)) return text("This sign-in link expired. Start again.", 400)
  const browser = cookieValue(request, env, `login_${state}`)
  const flow = await env.OAUTH_KV.get<Flow>(`login:flow:${state}`, "json")
  if (
    !browser ||
    !flow ||
    flow.expiresAt <= Date.now() ||
    flow.browserHash !== (await hash(browser))
  ) {
    return text("This sign-in link expired or belongs to another browser. Start again.", 400)
  }
  await env.OAUTH_KV.delete(`login:flow:${state}`)
  const headers = new Headers({
    "Set-Cookie": cookie(env, `login_${state}`, "", 0),
    "Cache-Control": "no-store"
  })
  const failure = (message: string, status: number) => new Response(message, { status, headers })
  if (params.has("error") || !params.get("code"))
    return failure("Google sign-in was cancelled. Start again.", 400)

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: params.get("code")!,
        redirect_uri: callbackUri(env),
        code_verifier: flow.verifier
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) return failure("Google sign-in could not be verified. Start again.", 401)
    const tokens = await response.json<{ id_token?: string }>()
    if (!tokens.id_token)
      return failure("Google did not return an identity token. Start again.", 401)
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "email", "email_verified", "nonce", "exp", "iat"],
      maxTokenAge: "10m",
      clockTolerance: 10
    })
    if (
      payload.nonce !== flow.nonce ||
      (payload.azp !== undefined && payload.azp !== env.GOOGLE_CLIENT_ID)
    )
      return failure("Google sign-in could not be verified. Start again.", 401)
    if (
      payload.email_verified !== true ||
      typeof payload.email !== "string" ||
      payload.email.toLowerCase() !== env.LOGIN_GOOGLE_EMAIL.toLowerCase() ||
      !payload.sub
    ) {
      return failure("This Google account is not allowed to use this gateway.", 403)
    }
    const token = random()
    const session: Session = {
      email: payload.email.toLowerCase(),
      sub: payload.sub,
      expiresAt: Date.now() + SESSION_TTL * 1000
    }
    await env.OAUTH_KV.put(`login:session:${await hash(token)}`, JSON.stringify(session), {
      expirationTtl: SESSION_TTL
    })
    headers.append("Set-Cookie", cookie(env, "session", token, SESSION_TTL))
    headers.set("Location", new URL(flow.returnTo, env.PUBLIC_ORIGIN).href)
    return new Response(null, { status: 302, headers })
  } catch {
    return failure("Google sign-in could not be verified. Start again.", 401)
  }
}

export async function logout(request: Request, env: Env) {
  if (request.method !== "POST") return text("Method not allowed", 405)
  const rejected = rejectForeignPost(request, env)
  if (rejected) return rejected
  const token = cookieValue(request, env, "session")
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token))
    await env.OAUTH_KV.delete(`login:session:${await hash(token)}`)
  return new Response(null, {
    status: 303,
    headers: {
      Location: env.PUBLIC_ORIGIN,
      "Set-Cookie": cookie(env, "session", "", 0),
      "Cache-Control": "no-store"
    }
  })
}
