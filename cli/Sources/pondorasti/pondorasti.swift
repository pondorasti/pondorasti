import Foundation

@main
struct Pondorasti {
  static func main() {
    let setup = Pondorasti()
    setup.run()
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

    // Step 2: Install/Update packages
    let packages = HomebrewPackage.defaultPackages
    let results = HomebrewPackageInstaller.installAll(packages)

    // Step 3: Show summary
    let summary = HomebrewPackageInstaller.generateSummary(from: results)
    ConsoleOutput.summary(
      installed: summary.installed,
      updated: summary.updated,
      failed: summary.failed
    )

    // Exit with appropriate code
    if !summary.failed.isEmpty {
      exit(1)
    }
  }
}
