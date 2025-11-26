import { describe, expect, test } from "bun:test"
import { parseGitHubUrl } from "./github"

describe("parseGitHubUrl", () => {
  test("parses standard HTTPS URLs", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses HTTPS URLs with .git suffix", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses SSH URLs", () => {
    expect(parseGitHubUrl("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses SSH URLs without .git suffix", () => {
    expect(parseGitHubUrl("git@github.com:owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses short owner/repo format", () => {
    expect(parseGitHubUrl("owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses tree URLs (branch paths)", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/tree/main")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses tree URLs with nested paths", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/tree/main/src/components")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses blob URLs (file paths)", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/blob/main/file.ts")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("parses blob URLs with nested file paths", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/blob/main/src/utils/helpers.ts")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("handles trailing slashes", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("handles whitespace", () => {
    expect(parseGitHubUrl("  https://github.com/owner/repo  ")).toEqual({
      owner: "owner",
      repo: "repo",
    })
  })

  test("returns null for invalid URLs", () => {
    expect(parseGitHubUrl("not-a-valid-url")).toBeNull()
  })

  test("returns null for empty string", () => {
    expect(parseGitHubUrl("")).toBeNull()
  })

  test("returns null for URLs without owner/repo", () => {
    expect(parseGitHubUrl("https://github.com/")).toBeNull()
  })
})
