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
      // Package is installed, try to upgrade it
      ConsoleOutput.step("Checking for updates...")

      let upgradeCommand =
        package.isCask
        ? "\(brew) upgrade --cask \(package.formula)" : "\(brew) upgrade \(package.formula)"
      let upgradeResult = Shell.execute(upgradeCommand)

      if upgradeResult.success {
        // Check if it was actually upgraded or already latest
        if upgradeResult.output.contains("already installed") {
          ConsoleOutput.info("\(package.name) is already at the latest version")
          return InstallResult(
            package: package,
            status: .alreadyLatest,
            message: nil
          )
        } else {
          ConsoleOutput.success("\(package.name) updated successfully")
          return InstallResult(
            package: package,
            status: .updated,
            message: nil
          )
        }
      } else {
        // Check if the error is due to a locked process
        if upgradeResult.error.contains("process has already locked") {
          ConsoleOutput.warning("Detected locked Homebrew process, attempting to resolve...")

          if handleLockedBrewProcess(for: package.formula) {
            // Retry the upgrade
            ConsoleOutput.step("Retrying update...")
            let retryCommand =
              package.isCask
              ? "\(brew) upgrade --cask \(package.formula)" : "\(brew) upgrade \(package.formula)"
            let retryResult = Shell.execute(retryCommand)

            if retryResult.success {
              ConsoleOutput.success("\(package.name) updated successfully after resolving lock")
              return InstallResult(
                package: package,
                status: .updated,
                message: nil
              )
            } else {
              ConsoleOutput.error(
                "Failed to update \(package.name) after resolving lock: \(retryResult.error)")
              return InstallResult(
                package: package,
                status: .failed,
                message: retryResult.error
              )
            }
          }
        }

        ConsoleOutput.warning("Failed to update \(package.name): \(upgradeResult.error)")
        return InstallResult(
          package: package,
          status: .failed,
          message: upgradeResult.error
        )
      }
    } else {
      // Package not installed, install it
      ConsoleOutput.step("Installing \(package.name)...")

      let installCommand =
        package.isCask
        ? "\(brew) install --cask \(package.formula)" : "\(brew) install \(package.formula)"
      let installResult = Shell.execute(installCommand)

      if installResult.success {
        ConsoleOutput.success("\(package.name) installed successfully")
        return InstallResult(
          package: package,
          status: .installed,
          message: nil
        )
      } else {
        // Check if the error is due to a locked process
        if installResult.error.contains("process has already locked") {
          ConsoleOutput.warning("Detected locked Homebrew process, attempting to resolve...")

          if handleLockedBrewProcess(for: package.formula) {
            // Retry the install
            ConsoleOutput.step("Retrying installation...")
            let retryCommand =
              package.isCask
              ? "\(brew) install --cask \(package.formula)" : "\(brew) install \(package.formula)"
            let retryResult = Shell.execute(retryCommand)

            if retryResult.success {
              ConsoleOutput.success("\(package.name) installed successfully after resolving lock")
              return InstallResult(
                package: package,
                status: .installed,
                message: nil
              )
            } else {
              ConsoleOutput.error(
                "Failed to install \(package.name) after resolving lock: \(retryResult.error)")
              return InstallResult(
                package: package,
                status: .failed,
                message: retryResult.error
              )
            }
          }
        }

        ConsoleOutput.error("Failed to install \(package.name): \(installResult.error)")
        return InstallResult(
          package: package,
          status: .failed,
          message: installResult.error
        )
      }
    }
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
