import Foundation

/// Manages individual package installation via Homebrew
struct HomebrewPackageInstaller {

  /// Result of a package installation attempt
  struct InstallResult {
    let package: HomebrewPackage
    let status: Status
    let message: String?

    enum Status {
      case installed
      case updated
      case alreadyLatest
      case failed
    }
  }

  /// Install or update a single package
  static func install(_ package: HomebrewPackage) -> InstallResult {
    guard let brew = HomebrewManager.brewPath() else {
      return InstallResult(
        package: package,
        status: .failed,
        message: "Homebrew not found"
      )
    }

    ConsoleOutput.toolInfo(
      name: package.name,
      description: package.description,
      category: package.category.rawValue
    )

    // Check if already installed
    let isInstalled = HomebrewManager.isPackageInstalled(package.formula, isCask: package.isCask)

    if isInstalled {
      ConsoleOutput.progress("Checking \(package.name) for updates...")
      return upgradePackage(package, brew: brew)
    } else {
      ConsoleOutput.progress("Installing \(package.name)...")
      return installPackage(package, brew: brew)
    }
  }

  /// Install a new package
  private static func installPackage(_ package: HomebrewPackage, brew: String) -> InstallResult {
    let command =
      package.isCask
      ? "\(brew) install --cask \(package.formula)"
      : "\(brew) install \(package.formula)"

    let result = executeBrewCommand(command, for: package, action: "install")

    switch result.status {
    case .installed:
      ConsoleOutput.success("\(package.name) installed successfully")
    case .failed:
      ConsoleOutput.error("Failed to install \(package.name): \(result.message ?? "")")
    default:
      break
    }

    return result
  }

  /// Upgrade an existing package
  private static func upgradePackage(_ package: HomebrewPackage, brew: String) -> InstallResult {
    let command =
      package.isCask
      ? "\(brew) upgrade --cask \(package.formula)"
      : "\(brew) upgrade \(package.formula)"

    let result = executeBrewCommand(command, for: package, action: "upgrade")

    switch result.status {
    case .updated:
      ConsoleOutput.success("\(package.name) updated successfully")
    case .alreadyLatest:
      ConsoleOutput.info("\(package.name) is already at the latest version")
    case .failed:
      ConsoleOutput.warning("Failed to update \(package.name): \(result.message ?? "")")
    default:
      break
    }

    return result
  }

  /// Execute a brew command with retry logic for locked processes
  private static func executeBrewCommand(
    _ command: String, for package: HomebrewPackage, action: String
  ) -> InstallResult {
    let result = Shell.execute(command)

    if result.success {
      // For upgrades, check if already at latest
      if action == "upgrade" && result.output.contains("already installed") {
        return InstallResult(
          package: package,
          status: .alreadyLatest,
          message: nil
        )
      }

      return InstallResult(
        package: package,
        status: action == "install" ? .installed : .updated,
        message: nil
      )
    }

    // Handle locked process error
    if result.error.contains("process has already locked") {
      ConsoleOutput.warning("Detected locked Homebrew process, attempting to resolve...")

      if handleLockedBrewProcess(for: package.formula) {
        ConsoleOutput.step("Retrying \(action)...")
        let retryResult = Shell.execute(command)

        if retryResult.success {
          return InstallResult(
            package: package,
            status: action == "install" ? .installed : .updated,
            message: nil
          )
        } else {
          return InstallResult(
            package: package,
            status: .failed,
            message: retryResult.error
          )
        }
      }
    }

    return InstallResult(
      package: package,
      status: .failed,
      message: result.error
    )
  }

  /// Handle locked Homebrew process by finding and killing it
  private static func handleLockedBrewProcess(for formula: String) -> Bool {
    // Find brew processes related to this formula
    let psResult = Shell.execute(
      "ps aux | grep -E 'brew (upgrade|install) \(formula)' | grep -v grep")

    if psResult.success && !psResult.output.isEmpty {
      let lines = psResult.output.components(separatedBy: .newlines)

      for line in lines where !line.isEmpty {
        let components = line.split(
          separator: " ", maxSplits: .max, omittingEmptySubsequences: true)
        if components.count > 1, let pid = Int(components[1]) {
          ConsoleOutput.info("Killing stuck brew process (PID: \(pid))...")
          Shell.execute("kill -9 \(pid)")
        }
      }

      // Give it a moment to clean up
      Thread.sleep(forTimeInterval: 1.0)

      // Also clean up any incomplete downloads
      cleanupIncompleteDownloads()

      return true
    }

    // Even if we didn't find a specific process, try cleaning up downloads
    cleanupIncompleteDownloads()
    return true
  }

  /// Clean up incomplete Homebrew downloads
  private static func cleanupIncompleteDownloads() {
    let cacheDir = NSHomeDirectory() + "/Library/Caches/Homebrew/downloads"
    Shell.execute("find \(cacheDir) -name '*.incomplete' -delete")
    ConsoleOutput.info("Cleaned up incomplete downloads")
  }

  /// Install multiple packages and return results
  static func installAll(_ packages: [HomebrewPackage]) -> [InstallResult] {
    ConsoleOutput.header("Installing Packages")

    var results: [InstallResult] = []

    for package in packages {
      let result = install(package)
      results.append(result)
    }

    return results
  }

  /// Generate summary from installation results
  static func generateSummary(from results: [InstallResult]) -> (
    installed: [String], updated: [String], failed: [String]
  ) {
    var installed: [String] = []
    var updated: [String] = []
    var failed: [String] = []

    for result in results {
      switch result.status {
      case .installed:
        installed.append(result.package.name)
      case .updated:
        updated.append(result.package.name)
      case .alreadyLatest:
        // Don't include in summary as no action was taken
        break
      case .failed:
        let failureMessage =
          result.message.map { "\(result.package.name) - \($0)" } ?? result.package.name
        failed.append(failureMessage)
      }
    }

    return (installed, updated, failed)
  }
}
