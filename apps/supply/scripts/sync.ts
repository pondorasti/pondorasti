import process from "node:process"

const origin = process.env.SUPPLY_ORIGIN ?? "http://localhost:5173"
const secret = process.env.SYNC_SECRET
if (!secret) throw new Error("SYNC_SECRET is required")
const status = process.argv.includes("--status")
const force = process.argv.includes("--force")
const url = new URL(`/api/sync${force ? "?force=1" : ""}`, origin)
if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Remote sync requires HTTPS")
}
const response = await fetch(url, {
  method: status ? "GET" : "POST",
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(15 * 60_000)
})
console.log(JSON.stringify(await response.json(), null, 2))
if (!response.ok) process.exitCode = 1
