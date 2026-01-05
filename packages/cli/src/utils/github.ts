export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  const normalized = url.trim().replace(/\/+$/, "")

  // Strip /tree/... or /blob/... suffixes (branch/file paths)
  const withoutTree = normalized.replace(/\/(tree|blob)\/.*$/, "")

  const patterns = [
    /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/, // Handles https and SSH formats
    /^([^/:]+)\/([^/]+?)(?:\.git)?$/, // Handles owner/repo format (no colons in owner, no slashes in repo)
  ]

  for (const pattern of patterns) {
    const match = withoutTree.match(pattern)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  }

  return null
}
