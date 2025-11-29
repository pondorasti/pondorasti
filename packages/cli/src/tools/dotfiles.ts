import * as path from "path"
import * as fs from "fs"
import * as os from "os"

// -------------------------------------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------------------------------------

export type PackageStatus = "linked" | "partial" | "unlinked"

export interface FileStatus {
  source: string
  target: string
  status: "linked" | "unlinked" | "conflict"
}

export interface PackageInfo {
  name: string
  status: PackageStatus
  files: FileStatus[]
}

// -------------------------------------------------------------------------------------------------------------------
// Paths
// -------------------------------------------------------------------------------------------------------------------

/**
 * Returns the path to the dotfiles/ directory in the repo root
 */
export function getDotfilesPath(): string {
  // dotfiles/ is at the root of the pondorasti repo
  return path.join(__dirname, "..", "..", "..", "..", "dotfiles")
}

/**
 * Returns the user's home directory
 */
export function getHomePath(): string {
  return os.homedir()
}

// -------------------------------------------------------------------------------------------------------------------
// Package Discovery
// -------------------------------------------------------------------------------------------------------------------

/**
 * Lists all available dotfile packages (subdirectories in dotfiles/)
 */
export function getPackages(): string[] {
  const dotfilesPath = getDotfilesPath()

  if (!fs.existsSync(dotfilesPath)) {
    return []
  }

  return fs
    .readdirSync(dotfilesPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => !name.startsWith(".")) // Ignore hidden directories
}

/**
 * Gets all files in a package recursively, returning relative paths
 */
function getPackageFiles(packageName: string): string[] {
  const packagePath = path.join(getDotfilesPath(), packageName)

  if (!fs.existsSync(packagePath)) {
    return []
  }

  const files: string[] = []

  function walkDir(dir: string, relativePath: string = "") {
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

// -------------------------------------------------------------------------------------------------------------------
// Status
// -------------------------------------------------------------------------------------------------------------------

/**
 * Gets the status of a single file
 */
function getFileStatus(packageName: string, relativePath: string): FileStatus {
  const source = path.join(getDotfilesPath(), packageName, relativePath)
  const target = path.join(getHomePath(), relativePath)

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

  // File exists but is not our symlink
  return { source, target, status: "conflict" }
}

/**
 * Gets detailed status of a package
 */
export function getPackageStatus(packageName: string): PackageInfo {
  const files = getPackageFiles(packageName)
  const fileStatuses = files.map((file) => getFileStatus(packageName, file))

  let status: PackageStatus = "unlinked"

  if (fileStatuses.length > 0) {
    const linkedCount = fileStatuses.filter((f) => f.status === "linked").length

    if (linkedCount === fileStatuses.length) {
      status = "linked"
    } else if (linkedCount > 0) {
      status = "partial"
    }
  }

  return {
    name: packageName,
    status,
    files: fileStatuses,
  }
}

/**
 * Gets status of all packages
 */
export function getAllPackageStatuses(): PackageInfo[] {
  return getPackages().map(getPackageStatus)
}

// -------------------------------------------------------------------------------------------------------------------
// Link / Unlink
// -------------------------------------------------------------------------------------------------------------------

/**
 * Links all files in a package to the home directory
 * Returns array of [source, target] pairs that were linked
 */
export function linkPackage(packageName: string): { linked: string[]; skipped: string[]; errors: string[] } {
  const files = getPackageFiles(packageName)
  const linked: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const file of files) {
    const source = path.join(getDotfilesPath(), packageName, file)
    const target = path.join(getHomePath(), file)

    // Check if target already exists
    if (fs.existsSync(target)) {
      const targetStat = fs.lstatSync(target)

      if (targetStat.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(target)
        if (linkTarget === source) {
          skipped.push(file)
          continue
        }
      }

      // File exists and is not our symlink - skip with error
      errors.push(`${file} (file exists at target)`)
      continue
    }

    // Ensure parent directory exists
    const targetDir = path.dirname(target)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Create symlink
    try {
      fs.symlinkSync(source, target)
      linked.push(file)
    } catch (err) {
      errors.push(`${file} (${err instanceof Error ? err.message : "unknown error"})`)
    }
  }

  return { linked, skipped, errors }
}

/**
 * Unlinks all files in a package from the home directory
 * Only removes symlinks that point to our dotfiles
 */
export function unlinkPackage(packageName: string): { unlinked: string[]; skipped: string[]; errors: string[] } {
  const files = getPackageFiles(packageName)
  const unlinked: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const file of files) {
    const source = path.join(getDotfilesPath(), packageName, file)
    const target = path.join(getHomePath(), file)

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

    // Safe to remove - it's our symlink
    try {
      fs.unlinkSync(target)
      unlinked.push(file)
    } catch (err) {
      errors.push(`${file} (${err instanceof Error ? err.message : "unknown error"})`)
    }
  }

  return { unlinked, skipped, errors }
}

