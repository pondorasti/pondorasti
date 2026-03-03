export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  const normalized = url.trim()
  if (!normalized) {
    return null
  }

  const toResult = (owner: string | undefined, repo: string | undefined) => {
    if (!owner || !repo) {
      return null
    }

    const cleanRepo = repo.replace(/\.git$/i, "")
    if (!cleanRepo) {
      return null
    }

    return { owner, repo: cleanRepo }
  }

  // Handles owner/repo (with optional trailing slash)
  const shortMatch = normalized.match(/^([^/:?#\s]+)\/([^/?#]+?)(?:\.git)?\/?$/)
  if (shortMatch) {
    return toResult(shortMatch[1], shortMatch[2])
  }

  // Handles git@github.com:owner/repo(.git)
  const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/?#]+?)(?:\.git)?\/?$/i)
  if (sshMatch) {
    return toResult(sshMatch[1], sshMatch[2])
  }

  // Allows github.com/owner/repo without protocol
  const urlCandidate = normalized.match(/^github\.com\//i) ? `https://${normalized}` : normalized

  try {
    const parsed = new URL(urlCandidate)
    const host = parsed.hostname.toLowerCase()
    if (host !== "github.com" && host !== "www.github.com") {
      return null
    }

    const segments = parsed.pathname.split("/").filter(Boolean)
    if (segments.length < 2) {
      return null
    }

    return toResult(segments[0], segments[1])
  } catch {
    return null
  }
}
