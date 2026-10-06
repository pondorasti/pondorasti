export function safeLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export function imagePath(hash: string): string {
  return `/images/${hash}`
}
