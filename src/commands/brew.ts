import type { CommandModule } from "yargs"
import { $ } from "bun"
import { HomebrewManager } from "../managers/homebrew"
import * as path from "path"
import * as fs from "fs"

interface BrewArgs {
  action?: string
  verbose?: boolean
  "dry-run"?: boolean // Global option
}

const brewCommand: CommandModule<{}, BrewArgs> = {
  command: "brew [action]",
  describe: "Manage Homebrew and install packages",

  builder: (yargs) => {
    return yargs
      .positional("action", {
        describe: "Action to perform",
        type: "string",
        choices: ["status", "bundle", "install"],
        default: "bundle",
      })
      .example("$0 brew", "Install/update Homebrew and run brew bundle")
      .example("$0 brew status", "Check Homebrew installation status")
      .example("$0 brew bundle", "Run brew bundle without installing Homebrew")
  },

  handler: async (argv) => {
    const { action, verbose } = argv
    const dryRun = argv["dry-run"]

    if (action === "status") {
      await checkStatus()
      return
    }

    // For install or bundle actions
    if (action === "install" || action === "bundle") {
      // Check if Homebrew is installed
      if (!HomebrewManager.isInstalled()) {
        if (action === "bundle") {
          console.error("✗ Homebrew is not installed. Run 'pondorasti brew install' first.")
          process.exit(1)
        }

        // Install Homebrew
        console.log("Installing Homebrew...")
        if (dryRun) {
          console.log("[DRY RUN] Would install Homebrew")
        } else {
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
        }
      }

      // Run brew bundle if not just installing
      if (action === "bundle" || (action === "install" && HomebrewManager.isInstalled())) {
        const brewfilePath = path.join(process.cwd(), "Brewfile")

        if (!fs.existsSync(brewfilePath)) {
          console.error("✗ No Brewfile found in current directory")
          process.exit(1)
        }

        console.log("Running brew bundle...")
        if (dryRun) {
          console.log("[DRY RUN] Would run: brew bundle")
        } else {
          try {
            // Show native brew bundle output
            await $`brew bundle`
          } catch (error) {
            console.error("✗ Failed to run brew bundle")
            process.exit(1)
          }
        }
      }
    }
  },
}

async function checkStatus() {
  const isInstalled = HomebrewManager.isInstalled()
  const brewPath = HomebrewManager.getBrewPath()

  if (isInstalled) {
    console.log(`✓ Homebrew is installed at ${brewPath}`)

    try {
      // Show brew version
      await $`brew --version`
    } catch (error) {
      console.error("⚠ Homebrew is installed but not working properly")
    }
  } else {
    console.log("✗ Homebrew is not installed")
    console.log("  Run 'pondorasti brew install' to install it")
  }
}

export default brewCommand
