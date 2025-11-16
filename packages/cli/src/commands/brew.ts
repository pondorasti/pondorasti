import type { CommandModule } from "yargs"
import { $ } from "bun"
import { HomebrewManager } from "../managers/homebrew"
import { failHandler } from "../utils/cli-helpers"
import * as path from "path"
import * as fs from "fs"

// Subcommands
const installCommand: CommandModule = {
  command: "install",
  describe: "Install Homebrew",
  handler: async () => {
    if (HomebrewManager.isInstalled()) {
      const brewPath = HomebrewManager.getBrewPath()
      console.log(`✓ Homebrew is already installed at ${brewPath}`)

      try {
        await $`brew --version`
      } catch (error) {
        console.error("⚠ Homebrew is installed but not working properly")
      }

      return
    }

    console.log("Installing Homebrew...")
    try {
      // Show native installer output
      await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

      // Configure for Apple Silicon
      const zprofilePath = path.join(process.env.HOME!, ".zprofile")
      const exportCommand = 'eval "$(/opt/homebrew/bin/brew shellenv)"'

      const content = fs.existsSync(zprofilePath) ? fs.readFileSync(zprofilePath, "utf8") : ""

      if (!content.includes(exportCommand)) {
        fs.appendFileSync(zprofilePath, `\n${exportCommand}\n`)
        console.log("✓ Added Homebrew to shell profile")
      }
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
    if (!HomebrewManager.isInstalled()) {
      console.error("✗ Homebrew is not installed. Run 'pondorasti brew install' first.")
      process.exit(1)
    }

    const brewfilePath = path.join(process.cwd(), "Brewfile")
    if (!fs.existsSync(brewfilePath)) {
      console.error("✗ No Brewfile found in current directory")
      process.exit(1)
    }

    try {
      await HomebrewManager.runBundle()
    } catch (error) {
      console.error("✗ Failed to run brew bundle")
      process.exit(1)
    }
  },
}

// Main brew command
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

export default brewCommand
