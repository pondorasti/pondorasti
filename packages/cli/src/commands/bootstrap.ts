import type { CommandModule } from "yargs"
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

    // Step 1: Install Oh My Zsh
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 1/3: Oh My Zsh")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await OhMyZsh.install()
    } catch (error) {
      console.error("✗ Failed to install Oh My Zsh")
      process.exit(1)
    }

    // Step 2: Install Homebrew
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 2/3: Homebrew")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.install()
    } catch (error) {
      console.error("✗ Failed to install Homebrew")
      process.exit(1)
    }

    // Step 3: Install packages from Brewfile
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 3/3: Install Packages (Brewfile)")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.bundle()
    } catch (error) {
      console.error("✗ Failed to run brew bundle")
      process.exit(1)
    }

    // Done!
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("✅ Bootstrap complete!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\nNext steps:")
    console.log("  1. Restart your terminal to load shell changes")
    console.log("  2. Run 'pd clone pondorasti/pondorasti' to get the repo")
    console.log("  3. Run 'pd dotfiles link' to set up dotfiles")
  },
}

// -------------------------------------------------------------------------------------------------------------------

export default bootstrapCommand
