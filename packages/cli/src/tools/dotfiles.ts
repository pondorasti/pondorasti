import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import * as childProcess from "child_process"

// -------------------------------------------------------------------------------------------------------------------
// Package Definitions
// -------------------------------------------------------------------------------------------------------------------

enum DotfilesPackage {
  Git = "git",
  Zsh = "zsh",
  Vscode = "vscode",
  Claude = "claude",
  Nvim = "nvim",
  Opencode = "opencode",
}

const PACKAGE_TARGET_PATHS: Partial<Record<DotfilesPackage, string[]>> = {
  [DotfilesPackage.Vscode]: [
    "~/Library/Application Support/Code/User",
    "~/Library/Application Support/Cursor/User",
  ],
  [DotfilesPackage.Claude]: ["~/.claude"],
  [DotfilesPackage.Nvim]: ["~/.config/nvim"],
  [DotfilesPackage.Opencode]: ["~/.config/opencode"],
}

const PACKAGE_LEGACY_SOURCE_NAMES: Partial<Record<DotfilesPackage, string[]>> = {
  [DotfilesPackage.Vscode]: ["cursor"],
}

function isDotfilesPackage(value: string): value is DotfilesPackage {
  return Object.values(DotfilesPackage).includes(value as DotfilesPackage)
}

// -------------------------------------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------------------------------------

type PackageStatus = "linked" | "partial" | "unlinked"

interface FileStatus {
  source: string
  target: string
  status: "linked" | "unlinked" | "conflict" | "dangling"
}

interface PackageInfo {
  name: string
  status: PackageStatus
  files: FileStatus[]
}

interface LinkResult {
  linked: string[]
  skipped: string[]
  pruned: string[]
  backedUp: string[]
  installedExtensions: string[]
  skippedExtensions: string[]
  errors: string[]
}

interface UnlinkResult {
  unlinked: string[]
  skipped: string[]
  errors: string[]
}

// -------------------------------------------------------------------------------------------------------------------
// Dotfiles Class
// -------------------------------------------------------------------------------------------------------------------

class Dotfiles {
  static basePath: string | null = null

  static getPath(): string {
    if (this.basePath) {
      return this.basePath
    }
    return path.join(__dirname, "..", "..", "dotfiles")
  }

  private static getHomePath(): string {
    return os.homedir()
  }

  private static expandHomePath(targetPath: string): string {
    if (targetPath.startsWith("~/")) {
      return path.join(os.homedir(), targetPath.slice(2))
    }
    return targetPath
  }

  private static getPackageTargetPaths(packageName: string): string[] {
    if (!isDotfilesPackage(packageName)) {
      return [this.getHomePath()]
    }

    const customPaths = PACKAGE_TARGET_PATHS[packageName]

    if (customPaths) {
      return customPaths.map((customPath) => this.expandHomePath(customPath))
    }

    return [this.getHomePath()]
  }

  static getPackages(): string[] {
    const dotfilesPath = this.getPath()

    if (!fs.existsSync(dotfilesPath)) {
      return []
    }

    return fs
      .readdirSync(dotfilesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => !name.startsWith("."))
  }

  private static getPackageFiles(packageName: string): string[] {
    const packagePath = path.join(this.getPath(), packageName)

    if (!fs.existsSync(packagePath)) {
      return []
    }

    const files: string[] = []

    const walkDir = (dir: string, relativePath: string = "") => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = path.join(relativePath, entry.name)

        if (entry.isDirectory()) {
          walkDir(fullPath, relPath)
        } else if (entry.isFile() && entry.name !== ".gitkeep" && !this.isPackageMetadataFile(packageName, relPath)) {
          files.push(relPath)
        }
      }
    }

    walkDir(packagePath)
    return files
  }

  private static isPackageMetadataFile(packageName: string, relativePath: string): boolean {
    return packageName === DotfilesPackage.Vscode && relativePath === "extensions.json"
  }

  private static isWithinDir(targetPath: string, dirPath: string): boolean {
    const relative = path.relative(dirPath, targetPath)
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
  }

  private static findDanglingSymlinks(packageName: string): FileStatus[] {
    const packagePath = path.join(this.getPath(), packageName)
    const legacyPackagePaths = this.getLegacyPackagePaths(packageName)
    const targetBasePaths = this.getPackageTargetPaths(packageName)
    const homePath = this.getHomePath()

    const packageFiles = this.getPackageFiles(packageName)
    if (packageFiles.length === 0) {
      return []
    }

    const scanRoots = new Set<string>()
    for (const targetBasePath of targetBasePaths) {
      if (!fs.existsSync(targetBasePath)) {
        continue
      }

      for (const file of packageFiles) {
        scanRoots.add(path.dirname(path.join(targetBasePath, file)))
      }
    }

    const results: FileStatus[] = []
    const visited = new Set<string>()

    const walkDir = (dir: string, maxDepth: number, depth: number = 0) => {
      if (visited.has(dir)) {
        return
      }
      visited.add(dir)

      let entries: fs.Dirent[] = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (depth < maxDepth) {
            walkDir(fullPath, maxDepth, depth + 1)
          }
          continue
        }

        if (!entry.isSymbolicLink()) {
          continue
        }

        let rawTarget: string
        try {
          rawTarget = fs.readlinkSync(fullPath)
        } catch {
          continue
        }

        const resolvedTarget = path.resolve(path.dirname(fullPath), rawTarget)

        const isCurrentPackageSource = this.isWithinDir(resolvedTarget, packagePath)
        const isLegacyPackageSource = legacyPackagePaths.some((legacyPackagePath) =>
          this.isWithinDir(resolvedTarget, legacyPackagePath),
        )

        if (!isCurrentPackageSource && !isLegacyPackageSource) {
          continue
        }

        if (fs.existsSync(resolvedTarget)) {
          continue
        }

        results.push({
          source: resolvedTarget,
          target: fullPath,
          status: "dangling",
        })
      }
    }

    for (const root of scanRoots) {
      if (!fs.existsSync(root)) {
        continue
      }
      const maxDepth = root === homePath ? 0 : Number.POSITIVE_INFINITY
      walkDir(root, maxDepth)
    }

    return results
  }

  private static getLegacyPackagePaths(packageName: string): string[] {
    if (!isDotfilesPackage(packageName)) {
      return []
    }

    return (PACKAGE_LEGACY_SOURCE_NAMES[packageName] ?? []).map((legacyPackageName) =>
      path.join(this.getPath(), legacyPackageName),
    )
  }

  private static getPackageFileStatuses(packageName: string, relativePath: string): FileStatus[] {
    const source = path.join(this.getPath(), packageName, relativePath)

    return this.getPackageTargetPaths(packageName).map((targetBasePath) => {
      const target = path.join(targetBasePath, relativePath)

      if (!fs.existsSync(target)) {
        return { source, target, status: "unlinked" }
      }

      const targetStat = fs.lstatSync(target)

      if (targetStat.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(target)
        if (linkTarget === source) {
          return { source, target, status: "linked" }
        }
      }

      return { source, target, status: "conflict" }
    })
  }

  static getPackageStatus(packageName: string): PackageInfo {
    const files = this.getPackageFiles(packageName)
    const fileStatuses = files.flatMap((file) => this.getPackageFileStatuses(packageName, file))
    const danglingStatuses = this.findDanglingSymlinks(packageName)

    const combined = new Map<string, FileStatus>()
    for (const status of fileStatuses) {
      combined.set(status.target, status)
    }
    for (const status of danglingStatuses) {
      combined.set(status.target, status)
    }

    let status: PackageStatus = "unlinked"

    const combinedStatuses = Array.from(combined.values())

    if (combinedStatuses.length > 0) {
      const linkedCount = combinedStatuses.filter((f) => f.status === "linked").length

      if (linkedCount === combinedStatuses.length) {
        status = "linked"
      } else if (linkedCount > 0) {
        status = "partial"
      }
    }

    return { name: packageName, status, files: combinedStatuses }
  }

  static getAllStatuses(): PackageInfo[] {
    return this.getPackages().map((pkg) => this.getPackageStatus(pkg))
  }

  static linkAll(options: { force?: boolean } = {}): void {
    for (const pkg of this.getPackages()) {
      console.log(`Linking ${pkg}...`)
      const result = this.link(pkg, options)

      for (const file of result.linked) {
        console.log(`  \x1b[32m✓\x1b[0m ${file}`)
      }
      for (const file of result.backedUp) {
        console.log(`  \x1b[32m✓\x1b[0m ${file} (backed up original)`)
      }
      for (const file of result.skipped) {
        console.log(`  \x1b[90m○\x1b[0m ${file} (already linked)`)
      }
      for (const file of result.pruned) {
        console.log(`  \x1b[32m✓\x1b[0m ${file} (removed dangling symlink)`)
      }
      for (const extension of result.installedExtensions) {
        console.log(`  \x1b[32m✓\x1b[0m ${extension} (extension installed)`)
      }
      for (const extension of result.skippedExtensions) {
        console.log(`  \x1b[90m○\x1b[0m ${extension} (extension already installed)`)
      }
      for (const error of result.errors) {
        console.log(`  \x1b[31m✗\x1b[0m ${error}`)
      }
    }
  }

  static link(packageName: string, options: { force?: boolean; prune?: boolean } = {}): LinkResult {
    const { force = false, prune = true } = options
    const files = this.getPackageFiles(packageName)
    const targetBasePaths = this.getPackageTargetPaths(packageName)
    const linked: string[] = []
    const skipped: string[] = []
    const pruned: string[] = []
    const backedUp: string[] = []
    const installedExtensions: string[] = []
    const skippedExtensions: string[] = []
    const errors: string[] = []

    if (prune) {
      const zombies = this.findDanglingSymlinks(packageName)
      for (const zombie of zombies) {
        try {
          fs.unlinkSync(zombie.target)
          pruned.push(this.formatTargetPath(zombie.target))
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error"
          errors.push(`${this.formatTargetPath(zombie.target)} (failed to remove: ${message})`)
        }
      }
    }

    for (const file of files) {
      const source = path.join(this.getPath(), packageName, file)
      for (const targetBasePath of targetBasePaths) {
        const target = path.join(targetBasePath, file)
        const displayPath = this.formatTargetPath(target)

        if (fs.existsSync(target)) {
          const targetStat = fs.lstatSync(target)

          if (targetStat.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(target)
            if (linkTarget === source) {
              skipped.push(displayPath)
              continue
            }
          }

          if (!force) {
            errors.push(`${displayPath} (file exists at target)`)
            continue
          }

          // Force mode: backup to temp dir and replace
          const backupDir = path.join(os.tmpdir(), "pondorasti-dotfiles-backup")
          const backupPath = path.join(backupDir, displayPath.replace(/^~\//, "home/"))
          const backupParentDir = path.dirname(backupPath)

          try {
            if (!fs.existsSync(backupParentDir)) {
              fs.mkdirSync(backupParentDir, { recursive: true })
            }
            fs.renameSync(target, backupPath)
            backedUp.push(displayPath)
          } catch (err) {
            errors.push(`${displayPath} (failed to backup: ${err instanceof Error ? err.message : "unknown error"})`)
            continue
          }
        }

        const targetDir = path.dirname(target)
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }

        try {
          fs.symlinkSync(source, target)
          linked.push(displayPath)
        } catch (err) {
          errors.push(`${displayPath} (${err instanceof Error ? err.message : "unknown error"})`)
        }
      }
    }

    const extensionResult = this.installExtensions(packageName)
    installedExtensions.push(...extensionResult.installed)
    skippedExtensions.push(...extensionResult.skipped)
    errors.push(...extensionResult.errors)

    return { linked, skipped, pruned, backedUp, installedExtensions, skippedExtensions, errors }
  }

  static unlink(packageName: string): UnlinkResult {
    const files = this.getPackageFiles(packageName)
    const targetBasePaths = this.getPackageTargetPaths(packageName)
    const unlinked: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const source = path.join(this.getPath(), packageName, file)
      for (const targetBasePath of targetBasePaths) {
        const target = path.join(targetBasePath, file)
        const displayPath = this.formatTargetPath(target)

        if (!fs.existsSync(target)) {
          skipped.push(displayPath)
          continue
        }

        const targetStat = fs.lstatSync(target)

        if (!targetStat.isSymbolicLink()) {
          errors.push(`${displayPath} (not a symlink)`)
          continue
        }

        const linkTarget = fs.readlinkSync(target)
        if (linkTarget !== source) {
          errors.push(`${displayPath} (symlink points elsewhere)`)
          continue
        }

        try {
          fs.unlinkSync(target)
          unlinked.push(displayPath)
        } catch (err) {
          errors.push(`${displayPath} (${err instanceof Error ? err.message : "unknown error"})`)
        }
      }
    }

    return { unlinked, skipped, errors }
  }

  private static formatTargetPath(target: string): string {
    const homePath = this.getHomePath()
    if (target === homePath) {
      return "~"
    }
    if (target.startsWith(`${homePath}${path.sep}`)) {
      return `~/${path.relative(homePath, target)}`
    }
    return target
  }

  private static installExtensions(packageName: string): {
    installed: string[]
    skipped: string[]
    errors: string[]
  } {
    if (packageName !== DotfilesPackage.Vscode) {
      return { installed: [], skipped: [], errors: [] }
    }

    const manifestPath = path.join(this.getPath(), packageName, "extensions.json")

    if (!fs.existsSync(manifestPath)) {
      return { installed: [], skipped: [], errors: [] }
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      recommendations?: unknown
      codeRecommendations?: unknown
      cursorRecommendations?: unknown
    }

    const installed: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const command of ["code", "cursor"]) {
      if (!this.isCommandAvailable(command)) {
        skipped.push(`${command} (command not found)`)
        continue
      }

      let installedExtensions: Set<string>
      try {
        const output = childProcess.execFileSync(command, ["--list-extensions"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        })
        installedExtensions = new Set(output.split("\n").map((line) => line.trim()).filter(Boolean))
      } catch (err) {
        errors.push(`${command} --list-extensions (${err instanceof Error ? err.message : "unknown error"})`)
        continue
      }

      const recommendations = this.getExtensionRecommendationsForCommand(command, manifest)

      for (const extension of recommendations) {
        if (installedExtensions.has(extension)) {
          skipped.push(`${command}:${extension}`)
          continue
        }

        try {
          childProcess.execFileSync(command, ["--install-extension", extension], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          })
          installed.push(`${command}:${extension}`)
        } catch (err) {
          errors.push(`${command}:${extension} (${err instanceof Error ? err.message : "unknown error"})`)
        }
      }
    }

    return { installed, skipped, errors }
  }

  private static getExtensionRecommendationsForCommand(
    command: string,
    manifest: {
      recommendations?: unknown
      codeRecommendations?: unknown
      cursorRecommendations?: unknown
    },
  ): string[] {
    const sharedRecommendations = this.getStringArray(manifest.recommendations)
    const editorRecommendations =
      command === "code"
        ? this.getStringArray(manifest.codeRecommendations)
        : this.getStringArray(manifest.cursorRecommendations)

    return Array.from(new Set([...sharedRecommendations, ...editorRecommendations]))
  }

  private static getStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  }

  private static isCommandAvailable(command: string): boolean {
    try {
      childProcess.execFileSync("/bin/zsh", ["-lc", `command -v ${command}`], {
        stdio: "ignore",
      })
      return true
    } catch {
      return false
    }
  }
}

export { Dotfiles, type PackageStatus, type PackageInfo, type FileStatus }
