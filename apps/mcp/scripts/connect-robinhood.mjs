import { auth } from "@modelcontextprotocol/client"
import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Robinhood supports localhost callbacks, but rejects our hosted callback even
// though dynamic client registration echoes it back as if it were registered.
const upstream = "https://agent.robinhood.com/mcp/trading"
let client, tokens, verifier, state, discovery, redirectUrl
let resolveCallback, rejectCallback
const callback = new Promise((resolve, reject) => {
  resolveCallback = resolve
  rejectCallback = reject
})
const provider = {
  get redirectUrl() {
    return redirectUrl
  },
  get clientMetadata() {
    return {
      client_name: "alexandru.so MCP gateway",
      client_uri: "https://mcp.alexandru.so",
      redirect_uris: [redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    }
  },
  clientInformation: () => client,
  saveClientInformation: (value) => {
    client = value
  },
  tokens: () => tokens,
  saveTokens: (value) => {
    tokens = value
  },
  codeVerifier: () => verifier,
  saveCodeVerifier: (value) => {
    verifier = value
  },
  state: () => {
    state = crypto.randomUUID()
    return state
  },
  discoveryState: () => discovery,
  saveDiscoveryState: (value) => {
    discovery = value
  },
  redirectToAuthorization: async (url) => {
    console.log("Approve Robinhood access in the browser:", url.href)
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "explorer.exe"
          : "xdg-open"
    const browser = spawn(command, [url.href], { stdio: "ignore" })
    browser.on("error", () => console.log("Open the URL above manually."))
  }
}
const server = createServer((request, response) => {
  const url = new URL(request.url, redirectUrl)
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Referrer-Policy", "no-referrer")
  if (
    request.method !== "GET" ||
    url.pathname !== "/callback" ||
    !state ||
    url.searchParams.get("state") !== state
  ) {
    response.writeHead(400).end("Invalid callback.")
    return
  }
  state = undefined
  if (url.searchParams.has("error") || !url.searchParams.get("code")) {
    rejectCallback(new Error("Robinhood authorization was declined."))
    response.writeHead(400).end("Authorization was declined. Return to your terminal.")
    return
  }
  resolveCallback({
    code: url.searchParams.get("code"),
    iss: url.searchParams.get("iss") ?? undefined
  })
  response.end("Authorization received. Return to your terminal to finish saving the connection.")
})

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    )
  })
}

let directory
const timeout = setTimeout(
  () => rejectCallback(new Error("Robinhood sign-in expired. Run the command again.")),
  10 * 60 * 1000
)
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "localhost", resolve)
  })
  redirectUrl = `http://localhost:${server.address().port}/callback`
  await auth(provider, { serverUrl: upstream })
  const result = await callback
  await auth(provider, { serverUrl: upstream, authorizationCode: result.code, iss: result.iss })
  if (!tokens?.access_token || !tokens.refresh_token)
    throw new Error("Robinhood did not return usable credentials.")
  directory = await mkdtemp(join(tmpdir(), "alexandru-robinhood-"))
  // Wrangler reads mode-600 files so secrets never appear in command arguments.
  for (const [name, value] of [
    ["client", client],
    ["tokens", tokens]
  ]) {
    const path = join(directory, `${name}.json`)
    await writeFile(path, JSON.stringify(value), { mode: 0o600 })
    await run("bunx", [
      "wrangler",
      "kv",
      "key",
      "put",
      `upstream:robinhood:${name}`,
      "--binding",
      "OAUTH_KV",
      "--remote",
      "--path",
      path
    ])
  }
  await run("bunx", [
    "wrangler",
    "kv",
    "key",
    "delete",
    "upstream:robinhood:tools",
    "--binding",
    "OAUTH_KV",
    "--remote"
  ])
  console.log("Robinhood connected. Reconnect your MCP client to refresh its tool list.")
} catch (error) {
  console.error(error instanceof Error ? error.message : "Robinhood connection failed.")
  process.exitCode = 1
} finally {
  clearTimeout(timeout)
  server.closeAllConnections()
  server.close()
  if (directory) await rm(directory, { recursive: true, force: true })
}
