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
  Opencode = "opencode",
}

const PACKAGE_TARGET_PATHS: Partial<Record<DotfilesPackage, string>> = {
  [DotfilesPackage.Cursor]: "~/Library/Application Support/Cursor/User",
  [DotfilesPackage.Claude]: "~/.claude",
  [DotfilesPackage.Agents]: "~/.claude", // OpenCode also reads from ~/.claude/skills/
  [DotfilesPackage.Nvim]: "~/.config/nvim",
  [DotfilesPackage.Opencode]: "~/.config/opencode",
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

  private static isWithinDir(targetPath: string, dirPath: string): boolean {
    const relative = path.relative(dirPath, targetPath)
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
  }

  private static findDanglingSymlinks(packageName: string): FileStatus[] {
    const packagePath = path.join(this.getPath(), packageName)
    const targetBasePath = this.getPackageTargetPath(packageName)
    const homePath = this.getHomePath()

    if (!fs.existsSync(targetBasePath)) {
      return []
    }

    const packageFiles = this.getPackageFiles(packageName)
    if (packageFiles.length === 0) {
      return []
    }

    const scanRoots = new Set<string>()
    for (const file of packageFiles) {
      scanRoots.add(path.dirname(path.join(targetBasePath, file)))
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

        if (!this.isWithinDir(resolvedTarget, packagePath)) {
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

  static getPackageStatus(packageName: string): PackageInfo {
    const files = this.getPackageFiles(packageName)
    const fileStatuses = files.map((file) => this.getFileStatus(packageName, file))
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
      for (const error of result.errors) {
        console.log(`  \x1b[31m✗\x1b[0m ${error}`)
      }
    }
  }

  static link(packageName: string, options: { force?: boolean; prune?: boolean } = {}): LinkResult {
    const { force = false, prune = true } = options
    const files = this.getPackageFiles(packageName)
    const targetBasePath = this.getPackageTargetPath(packageName)
    const linked: string[] = []
    const skipped: string[] = []
    const pruned: string[] = []
    const backedUp: string[] = []
    const errors: string[] = []

    if (prune) {
      const zombies = this.findDanglingSymlinks(packageName)
      for (const zombie of zombies) {
        try {
          fs.unlinkSync(zombie.target)
          pruned.push(path.relative(targetBasePath, zombie.target))
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error"
          errors.push(`${path.relative(targetBasePath, zombie.target)} (failed to remove: ${message})`)
        }
      }
    }

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

    return { linked, skipped, pruned, backedUp, errors }
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
