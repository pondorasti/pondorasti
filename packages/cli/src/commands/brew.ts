import type { CommandModule } from "yargs"
import { Homebrew } from "../tools/homebrew"
import { failHandler } from "../utils/cli-helpers"

// -------------------------------------------------------------------------------------------------------------------
// Subcommands
// -------------------------------------------------------------------------------------------------------------------

const installCommand: CommandModule = {
  command: "install",
  describe: "Install Homebrew",
  handler: async () => {
    try {
      await Homebrew.install()
    } catch (error) {
      console.error("✗ Failed to install Homebrew")
      process.exit(1)
    }
  },
}

const bundleCommand: CommandModule = {
  command: "bundle",
  describe: "Run brew bundle from Brewfile",
  handler: async () => {
    try {
      await Homebrew.bundle()
    } catch (error) {
      if (error instanceof Error) {
        console.error(`✗ ${error.message}`)
      } else {
        console.error("✗ Failed to run brew bundle")
      }
      process.exit(1)
    }
  },
}

// -------------------------------------------------------------------------------------------------------------------
// Main brew command
// -------------------------------------------------------------------------------------------------------------------

const brewCommand: CommandModule = {
  command: "brew",
  describe: "Manage Homebrew and install packages",
  builder: (yargs) => {
    return yargs.command(installCommand).command(bundleCommand).demandCommand(1).help().strict().fail(failHandler)
  },
  handler: () => {},
}

// -------------------------------------------------------------------------------------------------------------------

export { brewCommand }
