import type { CommandModule } from "yargs"
import { $ } from "bun"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { Defaults } from "../tools/defaults"
import { Dock } from "../tools/dock"
import { Dotfiles } from "../tools/dotfiles"
import { Homebrew } from "../tools/homebrew"
import { OhMyZsh } from "../tools/ohmyzsh"

// -------------------------------------------------------------------------------------------------------------------
// Bootstrap Command - Bootstraps a fresh machine
// -------------------------------------------------------------------------------------------------------------------

const bootstrapCommand: CommandModule = {
  command: "bootstrap",
  describe: "Bootstrap a fresh machine with all tools and packages",
  handler: async () => {
    console.log("🚀 Bootstrapping fresh machine...\n")

    // Step 1: Clear Dock
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 1/7: Clear Dock")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    Dock.clear()
    console.log("✓ Dock cleared")

    // Step 2: Install Oh My Zsh
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 2/7: Oh My Zsh")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await OhMyZsh.install()
    } catch (error) {
      console.error("✗ Failed to install Oh My Zsh")
      process.exit(1)
    }

    // Step 3: Install Homebrew
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 3/7: Homebrew")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.install()
    } catch (error) {
      console.error("✗ Failed to install Homebrew")
      process.exit(1)
    }

    // Step 4: Install packages from Brewfile
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 4/7: Install Packages (Brewfile)")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.bundle()
    } catch (error) {
      console.error("✗ Failed to run brew bundle")
      process.exit(1)
    }

    // Step 5: Link dotfiles
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 5/7: Link Dotfiles")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      Dotfiles.linkAll({ force: true })
    } catch (error) {
      console.error("✗ Failed to link dotfiles")
      process.exit(1)
    }

    // Step 6: Apply macOS defaults
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 6/7: Apply macOS Defaults")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      const result = Defaults.apply()
      for (const def of result.applied) {
        console.log(`  \x1b[32m✓\x1b[0m ${def.description}`)
      }
      for (const def of result.skipped) {
        console.log(`  \x1b[90m✓ ${def.description} (already set)\x1b[0m`)
      }
      for (const { def, error } of result.errors) {
        console.log(`  \x1b[31m✗\x1b[0m ${def.description}: ${error}`)
      }
    } catch (error) {
      console.error("✗ Failed to apply defaults")
      process.exit(1)
    }

    // Step 7: Clone repo and link pd from source
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 7/7: Setup pd from source")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      const repoDir = path.join(os.homedir(), "repos", "pondorasti", "pondorasti")
      const cliDir = path.join(repoDir, "packages", "cli")

      if (!fs.existsSync(repoDir)) {
        console.log("Cloning pondorasti/pondorasti...")
        const reposDir = path.join(os.homedir(), "repos", "pondorasti")
        fs.mkdirSync(reposDir, { recursive: true })
        await $`git clone https://github.com/pondorasti/pondorasti.git ${repoDir}`
        console.log("  \x1b[32m✓\x1b[0m Repository cloned")
      } else {
        console.log("  \x1b[90m✓ Repository already exists\x1b[0m")
      }

      console.log("Linking pd from source...")
      await $`bun link`.cwd(cliDir)
      console.log("  \x1b[32m✓\x1b[0m pd linked from source")
    } catch (error) {
      console.error("✗ Failed to setup pd from source")
      process.exit(1)
    }

    // Done!
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("✅ Bootstrap complete!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\nNext steps:")
    console.log("  1. Restart your terminal to load shell changes")
  },
}

// -------------------------------------------------------------------------------------------------------------------

export { bootstrapCommand }
