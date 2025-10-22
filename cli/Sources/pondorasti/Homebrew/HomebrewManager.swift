import Foundation

/// Manages Homebrew installation and operations
struct HomebrewManager {

  /// Check if Homebrew is installed (Apple Silicon only)
  static func isInstalled() -> Bool {
    let brewPath = "/opt/homebrew/bin/brew"

    if FileManager.default.fileExists(atPath: brewPath) {
      return true
    }

    // Also check if brew is in PATH (in case user has custom setup)
    let result = Shell.execute("which brew")
    return result.success
  }

  /// Get the Homebrew executable path (Apple Silicon only)
  static func brewPath() -> String? {
    let brewPath = "/opt/homebrew/bin/brew"

    if FileManager.default.fileExists(atPath: brewPath) {
      return brewPath
    }

    // Check if brew is in PATH (in case user has custom setup)
    let result = Shell.execute("which brew")
    if result.success {
      return result.output.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    return nil
  }

  /// Install Homebrew
  static func install() -> Bool {
    ConsoleOutput.step("Installing Homebrew...")

    // Official Homebrew installation script
    let installScript =
      "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""

    let result = Shell.execute(installScript, showOutput: true)

    if result.success {
      ConsoleOutput.success("Homebrew installed successfully")

      // Configure Homebrew for Apple Silicon
      ConsoleOutput.info("Configuring Homebrew for Apple Silicon...")
      let evalCommand = "echo 'eval \"$(/opt/homebrew/bin/brew shellenv)\"' >> ~/.zprofile"
      Shell.execute(evalCommand)
      Shell.execute("eval \"$(/opt/homebrew/bin/brew shellenv)\"")

      return true
    } else {
      ConsoleOutput.error("Failed to install Homebrew: \(result.error)")
      return false
    }
  }

  /// Update Homebrew itself
  static func update() -> Bool {
    guard let brew = brewPath() else {
      ConsoleOutput.error("Homebrew not found")
      return false
    }

    ConsoleOutput.step("Updating Homebrew...")

    let result = Shell.execute("\(brew) update")

    if result.success {
      ConsoleOutput.success("Homebrew updated successfully")
      return true
    } else {
      // Check if the error is due to a locked process
      if result.error.contains("already up-to-date") {
        ConsoleOutput.info("Homebrew is already up-to-date")
        return true
      } else if result.error.contains("Another active Homebrew")
        || result.error.contains("process has already locked")
      {
        ConsoleOutput.warning("Detected another Homebrew process running...")
        killAllBrewProcesses()

        // Retry update
        ConsoleOutput.step("Retrying Homebrew update...")
        let retryResult = Shell.execute("\(brew) update")

        if retryResult.success {
          ConsoleOutput.success("Homebrew updated successfully after resolving lock")
          return true
        }
      }

      ConsoleOutput.warning("Failed to update Homebrew: \(result.error)")
      // Don't fail completely if update fails, we can still try to install packages
      return true
    }
  }

  /// Kill all running brew processes
  static func killAllBrewProcesses() {
    ConsoleOutput.info("Cleaning up Homebrew processes...")

    // Find all brew processes
    let psResult = Shell.execute(
      "ps aux | grep -E '/opt/homebrew/bin/brew|brew upgrade|brew install' | grep -v grep")

    if psResult.success && !psResult.output.isEmpty {
      let lines = psResult.output.components(separatedBy: .newlines)
      var killedCount = 0

      for line in lines where !line.isEmpty {
        let components = line.split(
          separator: " ", maxSplits: .max, omittingEmptySubsequences: true)
        if components.count > 1, let pid = Int(components[1]) {
          Shell.execute("kill -9 \(pid)")
          killedCount += 1
        }
      }

      if killedCount > 0 {
        ConsoleOutput.info("Terminated \(killedCount) Homebrew process(es)")
        // Give it a moment to clean up
        Thread.sleep(forTimeInterval: 1.0)
      }
    }

    // Clean up any lock files
    Shell.execute("rm -f /opt/homebrew/var/homebrew/locks/*.lock")

    // Clean up incomplete downloads
    let cacheDir = NSHomeDirectory() + "/Library/Caches/Homebrew/downloads"
    Shell.execute("find \(cacheDir) -name '*.incomplete' -delete")
  }

  /// Check if a package is installed
  static func isPackageInstalled(_ package: String, isCask: Bool = false) -> Bool {
    guard let brew = brewPath() else { return false }

    let command = isCask ? "\(brew) list --cask \(package)" : "\(brew) list \(package)"
    let result = Shell.execute(command)
    return result.success
  }

  /// Get installed version of a package
  static func getInstalledVersion(_ package: String) -> String? {
    guard let brew = brewPath() else { return nil }

    let result = Shell.execute("\(brew) list --versions \(package)")
    if result.success {
      let output = result.output.trimmingCharacters(in: .whitespacesAndNewlines)
      // Output format: "package version1 version2..."
      let components = output.components(separatedBy: " ")
      if components.count >= 2 {
        return components[1]  // Return the first version
      }
    }
    return nil
  }
}

// MARK: - Shell Execution Helper

struct Shell {
  struct Result {
    let success: Bool
    let output: String
    let error: String
  }

  @discardableResult
  static func execute(_ command: String, showOutput: Bool = false) -> Result {
    let task = Process()
    let outputPipe = Pipe()
    let errorPipe = Pipe()

    task.standardOutput = outputPipe
    task.standardError = errorPipe
    task.arguments = ["-c", command]
    task.launchPath = "/bin/bash"
    task.standardInput = nil

    if showOutput {
      // For interactive commands like Homebrew installation
      task.standardOutput = FileHandle.standardOutput
      task.standardError = FileHandle.standardError
    }

    do {
      try task.run()
      task.waitUntilExit()

      let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()
      let errorData = errorPipe.fileHandleForReading.readDataToEndOfFile()

      let output = String(data: outputData, encoding: .utf8) ?? ""
      let error = String(data: errorData, encoding: .utf8) ?? ""

      return Result(
        success: task.terminationStatus == 0,
        output: output,
        error: error
      )
    } catch {
      return Result(
        success: false,
        output: "",
        error: error.localizedDescription
      )
    }
  }
}
