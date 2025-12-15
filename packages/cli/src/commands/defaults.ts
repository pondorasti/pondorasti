import type { CommandModule } from "yargs"
import { Defaults } from "../tools/defaults"
import { failHandler } from "../utils/cli-helpers"

// -------------------------------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------------------------------

function statusIcon(matches: boolean): string {
  return matches ? "✓" : "○"
}

function statusColor(matches: boolean): string {
  return matches ? "\x1b[32m" : "\x1b[33m" // green or yellow
}

const reset = "\x1b[0m"
const dim = "\x1b[90m"

// -------------------------------------------------------------------------------------------------------------------
// Subcommands
// -------------------------------------------------------------------------------------------------------------------

const applyCommand: CommandModule = {
  command: "apply",
  describe: "Apply all macOS defaults",
  handler: async () => {
    console.log("\nApplying macOS defaults...\n")

    const result = Defaults.apply()

    for (const def of result.applied) {
      console.log(`  \x1b[32m✓${reset} ${def.description}`)
    }

    for (const def of result.skipped) {
      console.log(`  ${dim}✓ ${def.description} (already set)${reset}`)
    }

    for (const { def, error } of result.errors) {
      console.log(`  \x1b[31m✗${reset} ${def.description}`)
      console.log(`    ${dim}${error}${reset}`)
    }

    console.log()

    if (result.applied.length > 0) {
      console.log(`Applied ${result.applied.length} default(s)`)
    }
    if (result.skipped.length > 0) {
      console.log(`${dim}Skipped ${result.skipped.length} (already set)${reset}`)
    }
    if (result.errors.length > 0) {
      console.log(`\x1b[31mFailed: ${result.errors.length}${reset}`)
    }

    console.log()
  },
}

const listCommand: CommandModule = {
  command: "list",
  describe: "List all macOS defaults that will be applied",
  handler: async () => {
    console.log("\nmacOS defaults:\n")

    const defaults = Defaults.config

    for (const def of defaults) {
      console.log(`  ${def.description}`)
      console.log(`    ${dim}${def.domain} ${def.key} = ${Defaults.formatValue(def.value)}${reset}`)
    }

    console.log()
    console.log(`Total: ${defaults.length} default(s)`)
    console.log()
  },
}

const statusCommand: CommandModule = {
  command: "status",
  describe: "Show current status of macOS defaults",
  handler: async () => {
    const statuses = Defaults.getStatus()

    for (const { def, current, matches } of statuses) {
      console.log(`  ${statusColor(matches)}${statusIcon(matches)}${reset} ${def.description}`)
      if (!matches) {
        console.log(`    ${dim}Current: ${Defaults.formatValue(current)}${reset}`)
        console.log(`    ${dim}Target: ${Defaults.formatValue(def.value)}${reset}`)
      }
    }

    const matched = statuses.filter((s) => s.matches).length
    const unmatched = statuses.length - matched

    console.log()
    if (unmatched > 0) {
      console.log(`${unmatched} default(s) need to be applied`)
    } else {
      console.log(`All ${matched} default(s) are set correctly`)
    }
    console.log()
  },
}

// -------------------------------------------------------------------------------------------------------------------
// Main defaults command
// -------------------------------------------------------------------------------------------------------------------

const defaultsCommand: CommandModule = {
  command: "defaults",
  describe: "Manage macOS system defaults",
  builder: (yargs) => {
    return yargs
      .command(applyCommand)
      .command(listCommand)
      .command(statusCommand)
      .demandCommand(1)
      .help()
      .strict()
      .fail(failHandler)
  },
  handler: () => {},
}

// -------------------------------------------------------------------------------------------------------------------

export { defaultsCommand }
