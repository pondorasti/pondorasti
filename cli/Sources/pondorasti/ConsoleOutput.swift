import Foundation

/// Utilities for formatted console output
struct ConsoleOutput {

  // MARK: - ANSI Color Codes
  private enum Color: String {
    case reset = "\u{001B}[0m"
    case red = "\u{001B}[31m"
    case green = "\u{001B}[32m"
    case yellow = "\u{001B}[33m"
    case blue = "\u{001B}[34m"
    case magenta = "\u{001B}[35m"
    case cyan = "\u{001B}[36m"
    case white = "\u{001B}[37m"
    case bold = "\u{001B}[1m"
  }

  // MARK: - Output Methods

  /// Print a success message in green
  static func success(_ message: String) {
    print("\(Color.green.rawValue)✓ \(message)\(Color.reset.rawValue)")
  }

  /// Print an error message in red
  static func error(_ message: String) {
    print("\(Color.red.rawValue)✗ \(message)\(Color.reset.rawValue)")
  }

  /// Print a warning message in yellow
  static func warning(_ message: String) {
    print("\(Color.yellow.rawValue)⚠ \(message)\(Color.reset.rawValue)")
  }

  /// Print an info message in blue
  static func info(_ message: String) {
    print("\(Color.blue.rawValue)ℹ \(message)\(Color.reset.rawValue)")
  }

  /// Print a header message in bold cyan
  static func header(_ message: String) {
    print("\n\(Color.bold.rawValue)\(Color.cyan.rawValue)\(message)\(Color.reset.rawValue)")
  }

  /// Print a step message with an arrow
  static func step(_ message: String) {
    print("\(Color.magenta.rawValue)→ \(message)\(Color.reset.rawValue)")
  }

  /// Print a tool description
  static func toolInfo(name: String, description: String, category: String) {
    print(
      "\n\(Color.bold.rawValue)\(name)\(Color.reset.rawValue) [\(Color.cyan.rawValue)\(category)\(Color.reset.rawValue)]"
    )
    print("  \(Color.white.rawValue)\(description)\(Color.reset.rawValue)")
  }

  /// Print a separator line
  static func separator() {
    print(
      "\(Color.white.rawValue)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\(Color.reset.rawValue)"
    )
  }

  /// Print the welcome banner
  static func welcomeBanner() {
    separator()
    print(
      """
      \(Color.bold.rawValue)\(Color.cyan.rawValue)
      🖥️  Pondorasti
      \(Color.reset.rawValue)
      \(Color.white.rawValue)Automated macOS setup and configuration tool\(Color.reset.rawValue)
      """)
    separator()
  }

  /// Print a summary section
  static func summary(installed: [String], updated: [String], failed: [String]) {
    separator()
    header("Setup Summary")

    if !installed.isEmpty {
      print("\n\(Color.green.rawValue)Newly Installed:\(Color.reset.rawValue)")
      installed.forEach { print("  • \($0)") }
    }

    if !updated.isEmpty {
      print("\n\(Color.blue.rawValue)Updated:\(Color.reset.rawValue)")
      updated.forEach { print("  • \($0)") }
    }

    if !failed.isEmpty {
      print("\n\(Color.red.rawValue)Failed:\(Color.reset.rawValue)")
      failed.forEach { print("  • \($0)") }
    }

    if installed.isEmpty && updated.isEmpty && failed.isEmpty {
      info("All tools are already up to date!")
    }

    separator()
  }

  /// Simple progress indicator (not animated to keep things simple)
  static func progress(_ message: String) {
    print("\(Color.cyan.rawValue)⏳ \(message)\(Color.reset.rawValue)")
  }
}
