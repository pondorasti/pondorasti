import Foundation

/// Represents a package that can be installed via Homebrew
struct HomebrewPackage {
  let name: String
  let formula: String
  let description: String
  let category: PackageCategory
  let isCask: Bool  // true for GUI apps (casks), false for CLI tools (formulae)

  init(
    name: String, formula: String? = nil, description: String, category: PackageCategory = .utility,
    isCask: Bool = false
  ) {
    self.name = name
    self.formula = formula ?? name
    self.description = description
    self.category = category
    self.isCask = isCask
  }
}

/// Categories for organizing packages
enum PackageCategory: String {
  case development = "Development"
  case monitoring = "System Monitoring"
  case utility = "Utility"
  case productivity = "Productivity"
  case application = "Application"
}

/// Default packages to install
extension HomebrewPackage {
  static let defaultPackages: [HomebrewPackage] = [
    HomebrewPackage(
      name: "lazygit",
      description: "Terminal UI for git commands - makes git operations visual and intuitive",
      category: .development
    ),
    HomebrewPackage(
      name: "lazydocker",
      description: "Terminal UI for Docker - manage containers, images, and volumes easily",
      category: .development
    ),
    HomebrewPackage(
      name: "fastfetch",
      description: "System information tool - displays system info with style",
      category: .monitoring
    ),
    HomebrewPackage(
      name: "btop",
      description: "Resource monitor - beautiful and powerful alternative to htop/top",
      category: .monitoring
    ),
    HomebrewPackage(
      name: "fzf",
      description: "Command-line fuzzy finder - search through files, history, processes, and more",
      category: .utility
    ),
    HomebrewPackage(
      name: "gh",
      description: "GitHub CLI - work with issues, PRs, releases, and more from the terminal",
      category: .development
    ),
    HomebrewPackage(
      name: "neovim",
      description: "Hyperextensible Vim-based text editor - modern fork with better plugin support",
      category: .development
    ),
    HomebrewPackage(
      name: "Ghostty",
      formula: "ghostty",
      description: "Fast, native terminal emulator with GPU acceleration and modern features",
      category: .application,
      isCask: true
    ),
    // HomebrewTool(
    //   name: "Raycast",
    //   formula: "raycast",
    //   description: "Productivity launcher with extensions - replaces Spotlight with superpowers",
    //   category: .application,
    //   isCask: true
    // ),
  ]
}
