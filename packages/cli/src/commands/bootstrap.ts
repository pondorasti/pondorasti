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
    console.log("Step 1/8: Clear Dock")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    Dock.clear()
    console.log("✓ Dock cleared")

    // Step 2: Install Oh My Zsh
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 2/8: Oh My Zsh")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await OhMyZsh.install()
    } catch (error) {
      console.error("✗ Failed to install Oh My Zsh")
      process.exit(1)
    }

    // Step 3: Install Homebrew
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 3/8: Homebrew")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.install()
    } catch (error) {
      console.error("✗ Failed to install Homebrew")
      process.exit(1)
    }

    // Step 4: Install packages from Brewfile
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 4/8: Install Packages (Brewfile)")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.bundle()
    } catch (error) {
      console.error("✗ Failed to run brew bundle")
      process.exit(1)
    }

    // Step 5: Clone repo
    const repoDir = path.join(os.homedir(), "repos", "pondorasti", "pondorasti")
    const cliDir = path.join(repoDir, "packages", "cli")
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 5/8: Clone Repository")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      if (!fs.existsSync(repoDir)) {
        console.log("Cloning pondorasti/pondorasti...")
        const reposDir = path.join(os.homedir(), "repos", "pondorasti")
        fs.mkdirSync(reposDir, { recursive: true })
        await $`git clone https://github.com/pondorasti/pondorasti.git ${repoDir}`
        console.log("  \x1b[32m✓\x1b[0m Repository cloned")
      } else {
        console.log("  \x1b[90m✓ Repository already exists\x1b[0m")
      }
    } catch (error) {
      console.error("✗ Failed to clone repository")
      process.exit(1)
    }

    // Step 6: Link dotfiles (from cloned repo)
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 6/8: Link Dotfiles")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      Dotfiles.basePath = path.join(cliDir, "dotfiles")
      Dotfiles.linkAll({ force: true })
    } catch (error) {
      console.error("✗ Failed to link dotfiles")
      process.exit(1)
    }

    // Step 7: Apply macOS defaults
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 7/8: Apply macOS Defaults")
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

    // Step 8: Link pd from source
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 8/8: Link pd from source")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      console.log("Running bun link...")
      await $`env PD_CLI_DIR=${cliDir} zsh -l -c ${'cd "$PD_CLI_DIR" && bun link'}`
      console.log("  \x1b[32m✓\x1b[0m pd linked from source")

      // Clean up the downloaded binary if running from one
      const execPath = process.execPath
      const isCompiledBinary = !execPath.includes("bun") && !execPath.includes(repoDir)
      if (isCompiledBinary && fs.existsSync(execPath)) {
        fs.unlinkSync(execPath)
        console.log("  \x1b[32m✓\x1b[0m Cleaned up downloaded binary")
      }
    } catch (error) {
      console.error("✗ Failed to link pd from source")
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
