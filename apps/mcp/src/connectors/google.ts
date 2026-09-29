/**
 * One Google sign-in shared by the Gmail and Calendar connectors. The gateway is a
 * confidential OAuth client (GOOGLE_CLIENT_ID/SECRET, project alexandru-mcp); the
 * refresh token and a cached access token live in OAUTH_KV under `google:tokens`.
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events"
]

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const TOKENS_KEY = "google:tokens"
const FLOW_TTL = 10 * 60

type StoredTokens = {
  refresh_token: string
  access_token: string
  /** Epoch milliseconds. */
  expires_at: number
  scope: string
}

type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export class GoogleReconnectError extends Error {
  constructor(env: Env, reason: string) {
    super(`Google sign-in ${reason}. Reconnect at ${env.PUBLIC_ORIGIN}/connect/google`)
  }
}

const redirectUri = (env: Env) => `${env.PUBLIC_ORIGIN}/connect/google/callback`

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** Returns the Google consent URL; state and PKCE verifier are kept in KV for 10 minutes. */
export async function startGoogleSignIn(env: Env) {
  const state = crypto.randomUUID()
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = base64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))
  )
  await env.OAUTH_KV.put(`google:flow:${state}`, verifier, { expirationTtl: FLOW_TTL })

  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(env),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    // offline + consent: Google only issues a refresh token when both are set
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString()
  return url
}

/** Handles /connect/google/callback. Throws with a user-facing message on failure. */
export async function finishGoogleSignIn(env: Env, params: URLSearchParams) {
  const state = params.get("state") ?? ""
  const verifier = await env.OAUTH_KV.get(`google:flow:${state}`)
  await env.OAUTH_KV.delete(`google:flow:${state}`)
  if (!state || !verifier) throw new Error("This sign-in link expired or was already used.")
  const error = params.get("error")
  if (error) throw new Error(`Google sign-in failed: ${error}`)

  const tokens = await tokenRequest(env, {
    grant_type: "authorization_code",
    code: params.get("code") ?? "",
    code_verifier: verifier,
    redirect_uri: redirectUri(env)
  })
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token.")
  const missing = GOOGLE_SCOPES.filter((scope) => !tokens.scope.split(" ").includes(scope))
  if (missing.length) {
    throw new Error(`Some permissions were left unchecked: ${missing.join(", ")}. Start again.`)
  }
  await saveTokens(env, tokens, tokens.refresh_token)
}

export async function isGoogleConnected(env: Env) {
  return (await env.OAUTH_KV.get(TOKENS_KEY)) !== null
}

/** A valid access token, refreshed when it is within a minute of expiring. */
export async function googleAccessToken(env: Env) {
  const stored = await env.OAUTH_KV.get<StoredTokens>(TOKENS_KEY, "json")
  if (!stored) throw new GoogleReconnectError(env, "is missing")
  if (stored.expires_at - 60_000 > Date.now()) return stored.access_token

  try {
    const tokens = await tokenRequest(env, {
      grant_type: "refresh_token",
      refresh_token: stored.refresh_token
    })
    return (await saveTokens(env, tokens, tokens.refresh_token ?? stored.refresh_token))
      .access_token
  } catch (error) {
    if (String(error).includes("invalid_grant")) {
      throw new GoogleReconnectError(env, "expired or was revoked")
    }
    throw error
  }
}

/** Authenticated JSON call to a Google API; throws with Google's error message. */
export async function googleApi<T>(
  env: Env,
  url: string | URL,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await googleAccessToken(env)}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  })
  if (!res.ok) {
    const body = await res.text()
    let message = body.slice(0, 300)
    try {
      message = (JSON.parse(body) as { error: { message: string } }).error.message
    } catch {}
    throw new Error(`Google ${res.status}: ${message}`)
  }
  return res.json<T>()
}

async function tokenRequest(env: Env, params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params
    })
  })
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json<TokenResponse>()
}

async function saveTokens(env: Env, tokens: TokenResponse, refreshToken: string) {
  const stored: StoredTokens = {
    refresh_token: refreshToken,
    access_token: tokens.access_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope
  }
  await env.OAUTH_KV.put(TOKENS_KEY, JSON.stringify(stored))
  return stored
}
