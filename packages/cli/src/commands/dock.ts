import type { CommandModule } from "yargs"
import { Dock } from "../tools/dock"
import { failHandler } from "../utils/cli-helpers"

// -------------------------------------------------------------------------------------------------------------------
// Subcommands
// -------------------------------------------------------------------------------------------------------------------

const clearCommand: CommandModule = {
  command: "clear",
  describe: "Remove all pinned apps from the Dock",
  handler: async () => {
    console.log("Clearing Dock...")
    Dock.clear()
    console.log("✓ Dock cleared")
  },
}

// -------------------------------------------------------------------------------------------------------------------
// Main dock command
// -------------------------------------------------------------------------------------------------------------------

const dockCommand: CommandModule = {
  command: "dock",
  describe: "Manage macOS Dock",
  builder: (yargs) => {
    return yargs.command(clearCommand).demandCommand(1).help().strict().fail(failHandler)
  },
  handler: () => {},
}

// -------------------------------------------------------------------------------------------------------------------

export default dockCommand
