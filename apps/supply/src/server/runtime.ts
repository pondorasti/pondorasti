export type HttpFetch = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>

export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}

export class SyncError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = "SyncError"
  }
}

export async function sha256(bytes: ArrayBuffer | string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
