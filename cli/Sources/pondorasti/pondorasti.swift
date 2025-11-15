import Foundation

@main
struct Pondorasti {
  static func main() {
    let args = CommandLine.arguments

    // Check for help flag
    if args.contains("-h") || args.contains("--help") {
      printHelp()
      exit(0)
    }

    // Initialize logging
    Shell.initializeLogging()

    let setup = Pondorasti()
    setup.run()
  }

  static func printHelp() {
    print(
      """
      Pondorasti - Automated macOS setup and configuration tool

      Usage: pondorasti [OPTIONS]

      Options:
        -h, --help      Show this help message

      Logs:
        Installation logs are saved to ~/.pondorasti/install.log
        Use 'tail -f ~/.pondorasti/install.log' to monitor progress
      """)
  }

  func run() {
    // Display welcome message
    ConsoleOutput.welcomeBanner()

    // Check system
    ConsoleOutput.header("System Check")
    ConsoleOutput.info("Running on macOS \(ProcessInfo.processInfo.operatingSystemVersionString)")
    ConsoleOutput.info("This tool is optimized for Apple Silicon Macs")

    // Step 1: Check and install Homebrew if needed
    ConsoleOutput.header("Homebrew Setup")

    if HomebrewManager.isInstalled() {
      ConsoleOutput.success("Homebrew is already installed")

      // Update Homebrew
      if !HomebrewManager.update() {
        ConsoleOutput.warning("Failed to update Homebrew, continuing anyway...")
      }
    } else {
      ConsoleOutput.warning("Homebrew not found")

      if !HomebrewManager.install() {
        ConsoleOutput.error(
          "Failed to install Homebrew. Please install it manually from https://brew.sh")
        exit(1)
      }
    }

    // Step 2: Install packages from Brewfile
    ConsoleOutput.header("Installing Packages")
    ConsoleOutput.info("Installing packages from Brewfile...")

    if let brewPath = HomebrewManager.brewPath() {
      let brewfileDir = FileManager.default.currentDirectoryPath
      let result = Shell.execute("\(brewPath) bundle --file=\(brewfileDir)/Brewfile")

      if result.success {
        ConsoleOutput.success("All packages installed/updated successfully")
        ConsoleOutput.info("Run 'brew bundle cleanup' to remove unlisted packages")
      } else {
        ConsoleOutput.error("Failed to install packages: \(result.error)")
        ConsoleOutput.info("Installation log saved to: ~/.pondorasti/install.log")
        exit(1)
      }
    } else {
      ConsoleOutput.error("Homebrew not found in PATH")
      exit(1)
    }

    // Step 3: Future setup tasks
    // TODO: Add additional setup tasks here:
    // - Dotfiles management (symlink from git repo)
    // - macOS system preferences configuration
    // - Development environment setup (git config, ssh keys, etc.)
    // - Shell configuration (zsh plugins, aliases, etc.)

    // Show log location
    ConsoleOutput.info("Installation log saved to: ~/.pondorasti/install.log")
  }
}
