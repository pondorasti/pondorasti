import type { CommandModule } from "yargs"
import { $ } from "bun"
import { Homebrew } from "../tools/homebrew"
import { failHandler } from "../utils/cli-helpers"
import * as path from "path"
import * as fs from "fs"

// -------------------------------------------------------------------------------------------------------------------
// Subcommands
// -------------------------------------------------------------------------------------------------------------------

const installCommand: CommandModule = {
  command: "install",
  describe: "Install Homebrew",
  handler: async () => {
    if (Homebrew.isInstalled()) {
      const brewPath = Homebrew.getBrewPath()
      console.log(`✓ Homebrew is already installed at ${brewPath}`)

      try {
        await $`brew --version`
      } catch (error) {
        console.error("⚠ Homebrew is installed but not working properly")
      }

      return
    }

    try {
      await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
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
    if (!Homebrew.isInstalled()) {
      console.error("✗ Homebrew is not installed. Run 'pondorasti brew install' first.")
      process.exit(1)
    }

    // Brewfile is always at the root of the pondorasti repo
    const brewfilePath = path.join(__dirname, "..", "..", "..", "..", "Brewfile")

    if (!fs.existsSync(brewfilePath)) {
      console.error("✗ Brewfile not found at expected location:", brewfilePath)
      console.error("This is likely a bug in the CLI configuration.")
      process.exit(1)
    }

    try {
      await Homebrew.runBundle(brewfilePath)
    } catch (error) {
      console.error("✗ Failed to run brew bundle")
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
    return yargs //
      .command(installCommand)
      .command(bundleCommand)
      .demandCommand(1)
      .help()
      .strict()
      .fail(failHandler)
  },
  handler: () => {
    // This handler is called when no subcommand is provided
    // But the fail handler above will handle it
  },
}

// -------------------------------------------------------------------------------------------------------------------

export default brewCommand
