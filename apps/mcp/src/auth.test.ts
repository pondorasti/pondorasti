import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose"
import { beforeAll, beforeEach, afterEach, expect, test, vi } from "vite-plus/test"
import { finishLogin, getSession, logout, startLogin } from "./auth"
import { authorize } from "./authorize"
import { connect } from "./connect"

const origin = "https://mcp.example.com"
const owner = "pondorasti@gmail.com"
const store = new Map<string, string>()
const limit = vi.fn<(params: { key: string }) => Promise<{ success: boolean }>>()
let key: CryptoKey
let wrongKey: CryptoKey
let jwk: Awaited<ReturnType<typeof exportJWK>>
let env: Env
let nonce: string
let claims: JWTPayload
let badSignature: boolean
let requestGoogle: ReturnType<typeof vi.fn<typeof fetch>>
const authRequest = {
  clientId: "client",
  redirectUri: "http://127.0.0.1:9876/callback",
  scope: ["mcp"]
}
const oauth = {
  parseAuthRequest: vi.fn<() => Promise<typeof authRequest>>(async () => authRequest),
  lookupClient: vi.fn<() => Promise<{ clientId: string; clientName: string }>>(async () => ({
    clientId: "client",
    clientName: "Codevisor"
  })),
  beginConsent: vi.fn<() => Promise<{ handle: string; headers: Headers }>>(async () => ({
    handle: "handle",
    headers: new Headers()
  })),
  approveConsent: vi.fn<() => Promise<{ request: typeof authRequest; headers: Headers }>>(
    async () => ({ request: authRequest, headers: new Headers() })
  ),
  completeAuthorization: vi.fn<() => Promise<{ redirectTo: string }>>(async () => ({
    redirectTo: "http://127.0.0.1:9876/callback?code=mcp-code"
  })),
  denyConsent: vi.fn<() => Promise<{ headers: Headers }>>(async () => ({
    headers: new Headers({ Location: "http://127.0.0.1:9876/callback?error=access_denied" })
  }))
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256")
  key = pair.privateKey
  wrongKey = (await generateKeyPair("RS256")).privateKey
  jwk = { ...(await exportJWK(pair.publicKey)), alg: "RS256", kid: "test-google", use: "sig" }
})

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  claims = {}
  nonce = ""
  badSignature = false
  limit.mockResolvedValue({ success: true })
  env = {
    PUBLIC_ORIGIN: origin,
    LOGIN_GOOGLE_EMAIL: owner,
    GOOGLE_CLIENT_ID: "google-client.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "google-secret",
    LOGIN_LIMITER: { limit },
    OAUTH_KV: {
      get: vi.fn<(name: string, type?: string) => Promise<unknown>>(async (name, type) => {
        const value = store.get(name)
        return value === undefined ? null : type === "json" ? JSON.parse(value) : value
      }),
      put: vi.fn<(name: string, value: string) => Promise<void>>(async (name, value) => {
        store.set(name, value)
      }),
      delete: vi.fn<(name: string) => Promise<void>>(async (name) => {
        store.delete(name)
      })
    },
    OAUTH_PROVIDER: oauth
  } as unknown as Env
  requestGoogle = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input
    if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [jwk] })
    if (url !== "https://oauth2.googleapis.com/token") throw new Error(`Unexpected request: ${url}`)
    const now = Math.floor(Date.now() / 1000)
    const id_token = await new SignJWT({
      iss: "https://accounts.google.com",
      aud: env.GOOGLE_CLIENT_ID,
      sub: "owner-sub",
      email: owner,
      email_verified: true,
      nonce,
      iat: now,
      exp: now + 300,
      ...claims
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-google" })
      .sign(badSignature ? wrongKey : key)
    return Response.json({ id_token, access_token: "unused-google-token" })
  })
  vi.stubGlobal("fetch", requestGoogle)
})

afterEach(() => vi.unstubAllGlobals())

const post = (path: string, body: Record<string, string>, cookie = "", from = origin) =>
  new Request(origin + path, {
    method: "POST",
    headers: { Origin: from, Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  })

async function begin(returnTo = "/authorize?client_id=client") {
  const response = await startLogin(post("/login/google", { returnTo }), env)
  expect(response.status).toBe(302)
  const url = new URL(response.headers.get("Location")!)
  nonce = url.searchParams.get("nonce")!
  const state = url.searchParams.get("state")!
  const cookie = response.headers.get("Set-Cookie")!.split(";")[0]
  return {
    response,
    url,
    state,
    cookie,
    callback: `${origin}/login/google/callback?state=${state}&code=google-code`
  }
}

async function signIn() {
  const flow = await begin()
  const response = await finishLogin(
    new Request(flow.callback, { headers: { Cookie: flow.cookie } }),
    env
  )
  expect(response.status).toBe(302)
  const session = response.headers
    .get("Set-Cookie")!
    .match(/__Host-mcp_session=([A-Za-z0-9_-]{43})/)![0]
  return { flow, response, cookie: session }
}

test("Google login requests only identity scopes and binds state, PKCE, nonce and the browser", async () => {
  const { response, url, state } = await begin()
  expect(url.origin).toBe("https://accounts.google.com")
  expect(url.searchParams.get("scope")).toBe("openid email")
  expect(url.searchParams.get("redirect_uri")).toBe(origin + "/login/google/callback")
  expect(url.searchParams.get("code_challenge_method")).toBe("S256")
  expect(url.searchParams.get("code_challenge")).toHaveLength(43)
  expect(url.searchParams.get("access_type")).toBeNull()
  expect(store.has(`login:flow:${state}`)).toBe(true)
  expect(response.headers.get("Set-Cookie")).toContain("HttpOnly; SameSite=Lax")
  expect(response.headers.get("Set-Cookie")).toContain("Secure")
  expect(response.headers.get("Set-Cookie")).not.toContain("Domain=")
})

test("a verified owner gets a browser session, not stored Google API credentials", async () => {
  const { response, cookie } = await signIn()
  expect(response.headers.get("Location")).toBe(origin + "/authorize?client_id=client")
  expect(await getSession(new Request(origin, { headers: { Cookie: cookie } }), env)).toMatchObject(
    { email: owner, sub: "owner-sub" }
  )
  expect([...store.keys()]).toHaveLength(1)
  expect(JSON.stringify([...store.values()])).not.toContain("unused-google-token")
  const tokenCall = requestGoogle.mock.calls.find(
    ([input]) => input === "https://oauth2.googleapis.com/token"
  )!
  expect(
    new URLSearchParams(tokenCall[1]?.body as URLSearchParams).get("code_verifier")
  ).toHaveLength(43)
  expect(tokenCall[1]?.redirect).toBe("manual")
})

test.each([{ email: "someone@example.com" }, { email_verified: false }])(
  "another account or an unverified email cannot authorize the gateway: %j",
  async (overrides) => {
    claims = overrides
    const flow = await begin()
    const response = await finishLogin(
      new Request(flow.callback, { headers: { Cookie: flow.cookie } }),
      env
    )
    expect(response.status).toBe(403)
    expect([...store.keys()].some((k) => k.startsWith("login:session:"))).toBe(false)
  }
)

test.each([
  { iss: "https://attacker.example" },
  { aud: "another-client" },
  { nonce: "wrong-nonce" },
  { azp: "another-client" },
  { exp: 1 }
])("invalid identity token claims are rejected: %j", async (overrides) => {
  claims = overrides
  const flow = await begin()
  const response = await finishLogin(
    new Request(flow.callback, { headers: { Cookie: flow.cookie } }),
    env
  )
  expect(response.status).toBe(401)
  expect([...store.keys()].some((k) => k.startsWith("login:session:"))).toBe(false)
})

test("an invalid Google signature cannot create a session", async () => {
  badSignature = true
  const flow = await begin()
  expect(
    (await finishLogin(new Request(flow.callback, { headers: { Cookie: flow.cookie } }), env))
      .status
  ).toBe(401)
})

test("a stolen callback URL without the initiating browser cookie cannot consume the flow", async () => {
  const flow = await begin()
  expect((await finishLogin(new Request(flow.callback), env)).status).toBe(400)
  expect(store.has(`login:flow:${flow.state}`)).toBe(true)
  expect(requestGoogle).not.toHaveBeenCalled()
})

test("a callback is single use", async () => {
  const { flow } = await signIn()
  const count = requestGoogle.mock.calls.length
  expect(
    (await finishLogin(new Request(flow.callback, { headers: { Cookie: flow.cookie } }), env))
      .status
  ).toBe(400)
  expect(requestGoogle).toHaveBeenCalledTimes(count)
})

test.each([
  "https://attacker.example/",
  "//attacker.example/",
  "/oauth/token",
  "/login/google/callback"
])("login rejects unsafe return URLs: %s", async (returnTo) => {
  expect((await startLogin(post("/login/google", { returnTo }), env)).status).toBe(400)
  expect(store.size).toBe(0)
})

test("cross-origin forms cannot start login or mutate a connection", async () => {
  expect(
    (await startLogin(post("/login/google", {}, "", "https://evil.example.com"), env)).status
  ).toBe(403)
  expect(
    (await connect(post("/connect/yc", {}, "", "https://evil.example.com"), env))?.status
  ).toBe(403)
})

test("login attempts are rate limited", async () => {
  limit.mockResolvedValue({ success: false })
  expect((await startLogin(post("/login/google", {}), env)).status).toBe(429)
})

test("expired browser sessions do not authorize requests", async () => {
  const { cookie } = await signIn()
  const name = [...store.keys()][0]
  const session = JSON.parse(store.get(name)!)
  store.set(name, JSON.stringify({ ...session, expiresAt: 1 }))
  expect(
    await getSession(new Request(origin, { headers: { Cookie: cookie } }), env)
  ).toBeUndefined()
})

test("logout revokes the server-side session", async () => {
  const { cookie } = await signIn()
  expect((await logout(post("/logout", {}, cookie), env)).status).toBe(303)
  expect(
    await getSession(new Request(origin, { headers: { Cookie: cookie } }), env)
  ).toBeUndefined()
})

test("anonymous consent shows Google sign-in and the old password cannot grant access", async () => {
  const response = await authorize(new Request(origin + "/authorize?client_id=client"), env)
  const body = await response.text()
  expect(body).toContain("Continue with Google")
  expect(body).not.toContain('type="password"')
  expect(
    (
      await authorize(
        post("/authorize", { handle: "handle", decision: "approve", password: "old-password" }),
        env
      )
    ).status
  ).toBe(401)
  expect(oauth.approveConsent).not.toHaveBeenCalled()
  expect(oauth.completeAuthorization).not.toHaveBeenCalled()
})

test("the owner can explicitly approve an MCP client using the existing consent handle", async () => {
  const { cookie } = await signIn()
  const response = await authorize(
    post("/authorize", { handle: "handle", decision: "approve" }, cookie),
    env
  )
  expect(response.headers.get("Location")).toBe("http://127.0.0.1:9876/callback?code=mcp-code")
  expect(oauth.approveConsent).toHaveBeenCalledWith(expect.any(Request), "handle", {
    scope: ["mcp"]
  })
  expect(oauth.completeAuthorization).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "alexandru", metadata: { email: owner } })
  )
})

test("anonymous connector callbacks cannot replace the gateway's upstream credentials", async () => {
  expect(
    (await connect(new Request(origin + "/connect/google/callback?code=code&state=state"), env))
      ?.status
  ).toBe(401)
  expect(requestGoogle).not.toHaveBeenCalled()
  expect(store.size).toBe(0)
})
