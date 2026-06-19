import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { Dotfiles } from "./dotfiles"

describe("Dotfiles", () => {
  let tempDir: string
  let homeDir: string
  let dotfilesDir: string
  let mockHomeDir: ReturnType<typeof spyOn>

  const codeSettingsPath = () => path.join(homeDir, "Library/Application Support/Code/User/settings.json")
  const cursorSettingsPath = () => path.join(homeDir, "Library/Application Support/Cursor/User/settings.json")
  const vscodeSettingsSourcePath = () => path.join(dotfilesDir, "vscode/settings.json")

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pondorasti-dotfiles-test-"))
    homeDir = path.join(tempDir, "home")
    dotfilesDir = path.join(tempDir, "dotfiles")

    fs.mkdirSync(path.join(dotfilesDir, "vscode"), { recursive: true })
    fs.writeFileSync(vscodeSettingsSourcePath(), "{}\n")

    Dotfiles.basePath = dotfilesDir
    mockHomeDir = spyOn(os, "homedir").mockImplementation(() => homeDir)
  })

  afterEach(() => {
    mockHomeDir.mockRestore()
    Dotfiles.basePath = null
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test("links vscode dotfiles into VS Code and Cursor user config directories", () => {
    const result = Dotfiles.link("vscode")

    expect(result.errors).toEqual([])
    expect(result.linked).toEqual([
      "~/Library/Application Support/Code/User/settings.json",
      "~/Library/Application Support/Cursor/User/settings.json",
    ])
    expect(fs.readlinkSync(codeSettingsPath())).toBe(vscodeSettingsSourcePath())
    expect(fs.readlinkSync(cursorSettingsPath())).toBe(vscodeSettingsSourcePath())
  })

  test("unlinks vscode dotfiles from both app config directories", () => {
    Dotfiles.link("vscode")

    const result = Dotfiles.unlink("vscode")

    expect(result.errors).toEqual([])
    expect(result.unlinked).toEqual([
      "~/Library/Application Support/Code/User/settings.json",
      "~/Library/Application Support/Cursor/User/settings.json",
    ])
    expect(fs.existsSync(codeSettingsPath())).toBe(false)
    expect(fs.existsSync(cursorSettingsPath())).toBe(false)
  })

  test("reports partial status when only one app target is linked", () => {
    fs.mkdirSync(path.dirname(codeSettingsPath()), { recursive: true })
    fs.symlinkSync(vscodeSettingsSourcePath(), codeSettingsPath())
    fs.mkdirSync(path.dirname(cursorSettingsPath()), { recursive: true })
    fs.writeFileSync(cursorSettingsPath(), "{}\n")

    const status = Dotfiles.getPackageStatus("vscode")

    expect(status.status).toBe("partial")
    expect(status.files).toEqual([
      {
        source: vscodeSettingsSourcePath(),
        target: codeSettingsPath(),
        status: "linked",
      },
      {
        source: vscodeSettingsSourcePath(),
        target: cursorSettingsPath(),
        status: "conflict",
      },
    ])
  })

  test("prunes dangling Cursor symlinks from the previous cursor folder name", () => {
    const legacyCursorSourcePath = path.join(dotfilesDir, "cursor/settings.json")

    fs.mkdirSync(path.dirname(cursorSettingsPath()), { recursive: true })
    fs.symlinkSync(legacyCursorSourcePath, cursorSettingsPath())

    const result = Dotfiles.link("vscode")

    expect(result.errors).toEqual([])
    expect(result.pruned).toEqual(["~/Library/Application Support/Cursor/User/settings.json"])
    expect(fs.readlinkSync(cursorSettingsPath())).toBe(vscodeSettingsSourcePath())
  })
})
