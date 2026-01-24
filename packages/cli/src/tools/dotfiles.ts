import * as path from "path"
import * as fs from "fs"
import * as os from "os"

// -------------------------------------------------------------------------------------------------------------------
// Package Definitions
// -------------------------------------------------------------------------------------------------------------------

enum DotfilesPackage {
  Git = "git",
  Zsh = "zsh",
  Cursor = "cursor",
  Claude = "claude",
  Agents = "agents",
  Nvim = "nvim",
}

const PACKAGE_TARGET_PATHS: Partial<Record<DotfilesPackage, string>> = {
  [DotfilesPackage.Cursor]: "~/Library/Application Support/Cursor/User",
  [DotfilesPackage.Claude]: "~/.claude",
  [DotfilesPackage.Agents]: "~/.claude", // OpenCode also reads from ~/.claude/skills/
  [DotfilesPackage.Nvim]: "~/.config/nvim",
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
  status: "linked" | "unlinked" | "conflict"
}

interface PackageInfo {
  name: string
  status: PackageStatus
  files: FileStatus[]
}

interface LinkResult {
  linked: string[]
  skipped: string[]
  backedUp: string[]
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

  private static getPackageTargetPath(packageName: string): string {
    if (!isDotfilesPackage(packageName)) {
      return this.getHomePath()
    }

    const customPath = PACKAGE_TARGET_PATHS[packageName]

    if (customPath) {
      // Expand ~ to home directory
      if (customPath.startsWith("~/")) {
        return path.join(os.homedir(), customPath.slice(2))
      }
      return customPath
    }

    return this.getHomePath()
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
        } else if (entry.isFile() && entry.name !== ".gitkeep") {
          files.push(relPath)
        }
      }
    }

    walkDir(packagePath)
    return files
  }

  private static getFileStatus(packageName: string, relativePath: string): FileStatus {
    const source = path.join(this.getPath(), packageName, relativePath)
    const target = path.join(this.getPackageTargetPath(packageName), relativePath)

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
  }

  static getPackageStatus(packageName: string): PackageInfo {
    const files = this.getPackageFiles(packageName)
    const fileStatuses = files.map((file) => this.getFileStatus(packageName, file))

    let status: PackageStatus = "unlinked"

    if (fileStatuses.length > 0) {
      const linkedCount = fileStatuses.filter((f) => f.status === "linked").length

      if (linkedCount === fileStatuses.length) {
        status = "linked"
      } else if (linkedCount > 0) {
        status = "partial"
      }
    }

    return { name: packageName, status, files: fileStatuses }
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
      for (const error of result.errors) {
        console.log(`  \x1b[31m✗\x1b[0m ${error}`)
      }
    }
  }

  static link(packageName: string, options: { force?: boolean } = {}): LinkResult {
    const { force = false } = options
    const files = this.getPackageFiles(packageName)
    const targetBasePath = this.getPackageTargetPath(packageName)
    const linked: string[] = []
    const skipped: string[] = []
    const backedUp: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const source = path.join(this.getPath(), packageName, file)
      const target = path.join(targetBasePath, file)

      if (fs.existsSync(target)) {
        const targetStat = fs.lstatSync(target)

        if (targetStat.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(target)
          if (linkTarget === source) {
            skipped.push(file)
            continue
          }
        }

        if (!force) {
          errors.push(`${file} (file exists at target)`)
          continue
        }

        // Force mode: backup to temp dir and replace
        const backupDir = path.join(os.tmpdir(), "pondorasti-dotfiles-backup")
        const backupPath = path.join(backupDir, file)
        const backupParentDir = path.dirname(backupPath)

        try {
          if (!fs.existsSync(backupParentDir)) {
            fs.mkdirSync(backupParentDir, { recursive: true })
          }
          fs.renameSync(target, backupPath)
          backedUp.push(file)
        } catch (err) {
          errors.push(`${file} (failed to backup: ${err instanceof Error ? err.message : "unknown error"})`)
          continue
        }
      }

      const targetDir = path.dirname(target)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      try {
        fs.symlinkSync(source, target)
        linked.push(file)
      } catch (err) {
        errors.push(`${file} (${err instanceof Error ? err.message : "unknown error"})`)
      }
    }

    return { linked, skipped, backedUp, errors }
  }

  static unlink(packageName: string): UnlinkResult {
    const files = this.getPackageFiles(packageName)
    const targetBasePath = this.getPackageTargetPath(packageName)
    const unlinked: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const source = path.join(this.getPath(), packageName, file)
      const target = path.join(targetBasePath, file)

      if (!fs.existsSync(target)) {
        skipped.push(file)
        continue
      }

      const targetStat = fs.lstatSync(target)

      if (!targetStat.isSymbolicLink()) {
        errors.push(`${file} (not a symlink)`)
        continue
      }

      const linkTarget = fs.readlinkSync(target)
      if (linkTarget !== source) {
        errors.push(`${file} (symlink points elsewhere)`)
        continue
      }

      try {
        fs.unlinkSync(target)
        unlinked.push(file)
      } catch (err) {
        errors.push(`${file} (${err instanceof Error ? err.message : "unknown error"})`)
      }
    }

    return { unlinked, skipped, errors }
  }
}

export { Dotfiles, type PackageStatus, type PackageInfo, type FileStatus }
