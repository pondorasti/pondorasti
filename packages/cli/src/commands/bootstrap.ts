import type { CommandModule } from "yargs"
import { Homebrew } from "../tools/homebrew"

// -------------------------------------------------------------------------------------------------------------------
// Bootstrap Command - Bootstraps a fresh machine
// -------------------------------------------------------------------------------------------------------------------

const bootstrapCommand: CommandModule = {
  command: "bootstrap",
  describe: "Bootstrap a fresh machine with all tools and packages",
  handler: async () => {
    console.log("🚀 Bootstrapping fresh machine...\n")

    // Step 1: Install Homebrew
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 1/2: Homebrew")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    try {
      await Homebrew.install()
    } catch (error) {
      console.error("✗ Failed to install Homebrew")
      process.exit(1)
    }

    // Step 2: Run brew bundle (installs everything including Bun)
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Step 2/2: Install Packages (Brewfile)")
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
