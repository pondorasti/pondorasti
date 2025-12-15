import type { CommandModule } from "yargs"
import { failHandler } from "../utils/cli-helpers"
import { Dotfiles, type PackageStatus } from "../tools/dotfiles"
import * as fs from "fs"

// -------------------------------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------------------------------

function statusIcon(status: PackageStatus | "linked" | "unlinked" | "conflict"): string {
  switch (status) {
    case "linked":
      return "✓"
    case "partial":
      return "◐"
    case "unlinked":
      return "○"
    case "conflict":
      return "✗"
  }
}

function statusColor(status: PackageStatus | "linked" | "unlinked" | "conflict"): string {
  switch (status) {
    case "linked":
      return "\x1b[32m" // green
    case "partial":
      return "\x1b[33m" // yellow
    case "unlinked":
      return "\x1b[90m" // gray
    case "conflict":
      return "\x1b[31m" // red
  }
}

const reset = "\x1b[0m"

// -------------------------------------------------------------------------------------------------------------------
// Subcommands
// -------------------------------------------------------------------------------------------------------------------

const linkCommand: CommandModule<{}, { package?: string; force?: boolean }> = {
  command: "link [package]",
  describe: "Symlink dotfiles to home directory",
  builder: (yargs) => {
    return yargs
      .positional("package", {
        describe: "Package name to link (links all if omitted)",
        type: "string",
      })
      .option("force", {
        alias: "f",
        describe: "Backup and replace existing files",
        type: "boolean",
        default: false,
      })
  },
  handler: async (argv) => {
    const dotfilesPath = Dotfiles.getPath()

    if (!fs.existsSync(dotfilesPath)) {
      console.error("✗ No dotfiles/ directory found at", dotfilesPath)
      process.exit(1)
    }

    const packages = argv.package ? [argv.package] : Dotfiles.getPackages()

    if (packages.length === 0) {
      console.log("No packages found in dotfiles/")
      return
    }

    if (argv.package) {
      const allPackages = Dotfiles.getPackages()
      if (!allPackages.includes(argv.package)) {
        console.error(`✗ Package "${argv.package}" not found`)
        console.error("  Available packages:", allPackages.join(", "))
        process.exit(1)
      }
    }

    for (const pkg of packages) {
      console.log(`\nLinking ${pkg}...`)
      const result = Dotfiles.link(pkg, { force: argv.force })

      for (const file of result.linked) {
        const wasBackedUp = result.backedUp.includes(file)
        const suffix = wasBackedUp ? " (backed up original)" : ""
        console.log(`  ${statusColor("linked")}${statusIcon("linked")}${reset} ${file}${suffix}`)
      }

      for (const file of result.skipped) {
        console.log(`  ${statusColor("linked")}${statusIcon("linked")}${reset} ${file} (already linked)`)
      }

      for (const error of result.errors) {
        console.log(`  ${statusColor("conflict")}${statusIcon("conflict")}${reset} ${error}`)
      }

      if (result.linked.length === 0 && result.skipped.length === 0 && result.errors.length === 0) {
        console.log("  (no files)")
      }
    }

    console.log()
  },
}

const unlinkCommand: CommandModule<{}, { package?: string }> = {
  command: "unlink [package]",
  describe: "Remove dotfile symlinks from home directory",
  builder: (yargs) => {
    return yargs.positional("package", {
      describe: "Package name to unlink (unlinks all if omitted)",
      type: "string",
    })
  },
  handler: async (argv) => {
    const packages = argv.package ? [argv.package] : Dotfiles.getPackages()

    if (packages.length === 0) {
      console.log("No packages found in dotfiles/")
      return
    }

    if (argv.package) {
      const allPackages = Dotfiles.getPackages()
      if (!allPackages.includes(argv.package)) {
        console.error(`✗ Package "${argv.package}" not found`)
        console.error("  Available packages:", allPackages.join(", "))
        process.exit(1)
      }
    }

    for (const pkg of packages) {
      console.log(`\nUnlinking ${pkg}...`)
      const result = Dotfiles.unlink(pkg)

      for (const file of result.unlinked) {
        console.log(`  ${statusColor("unlinked")}${statusIcon("unlinked")}${reset} ${file}`)
      }

      for (const file of result.skipped) {
        console.log(`  ${statusColor("unlinked")}${statusIcon("unlinked")}${reset} ${file} (not linked)`)
      }

      for (const error of result.errors) {
        console.log(`  ${statusColor("conflict")}${statusIcon("conflict")}${reset} ${error}`)
      }

      if (result.unlinked.length === 0 && result.skipped.length === 0 && result.errors.length === 0) {
        console.log("  (no files)")
      }
    }

    console.log()
  },
}

const statusCommand: CommandModule = {
  command: "status",
  describe: "Show status of dotfile packages",
  handler: async () => {
    const dotfilesPath = Dotfiles.getPath()

    if (!fs.existsSync(dotfilesPath)) {
      console.error("✗ No dotfiles/ directory found at", dotfilesPath)
      process.exit(1)
    }

    const statuses = Dotfiles.getAllStatuses()

    if (statuses.length === 0) {
      console.log("No packages found in dotfiles/")
      return
    }

    console.log("\nDotfiles status:\n")

    for (const pkg of statuses) {
      console.log(`${statusColor(pkg.status)}${statusIcon(pkg.status)}${reset} ${pkg.name}`)

      for (const file of pkg.files) {
        const relativePath = file.target.replace(process.env.HOME || "", "~")
        console.log(`    ${statusColor(file.status)}${statusIcon(file.status)}${reset} ${relativePath}`)
      }
    }

    console.log()
  },
}

// -------------------------------------------------------------------------------------------------------------------
// Main dotfiles command
// -------------------------------------------------------------------------------------------------------------------

const dotfilesCommand: CommandModule = {
  command: "dotfiles",
  describe: "Manage dotfiles with symlinks",
  builder: (yargs) => {
    return yargs
      .command(linkCommand)
      .command(unlinkCommand)
      .command(statusCommand)
      .demandCommand(1)
      .help()
      .strict()
      .fail(failHandler)
  },
  handler: () => {},
}

// -------------------------------------------------------------------------------------------------------------------

export { dotfilesCommand }
