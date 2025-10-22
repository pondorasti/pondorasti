# Pondorasti - macOS Setup CLI

A Swift-based command-line tool that automates the setup of a new macOS machine with essential developer tools.

## Features

- **Automated Homebrew Installation**: Checks for Homebrew and installs it if not present
- **Tool Installation/Updates**: Installs and keeps the following tools up to date:
  - **lazygit**: Terminal UI for git commands (makes git operations visual and intuitive)
  - **lazydocker**: Terminal UI for Docker (manage containers, images, and volumes easily)
  - **fastfetch**: System information tool (displays system info with style)
  - **btop**: Resource monitor (beautiful and powerful alternative to htop/top)
  - **fzf**: Command-line fuzzy finder (search through files, history, processes, and more)
  - **gh**: GitHub CLI (work with issues, PRs, releases, and more from the terminal)
  - **neovim**: Hyperextensible Vim-based text editor (modern fork with better plugin support)
  - **Ghostty**: Fast, native terminal emulator with GPU acceleration and modern features
- **Idempotent**: Can be run multiple times safely - will update existing tools to latest versions
- **Beautiful Output**: Color-coded terminal output with clear status indicators
- **Apple Silicon Optimized**: Designed specifically for M1/M2/M3 and newer Macs
- **Automatic Lock Resolution**: Detects and resolves stuck Homebrew processes automatically

## Installation

1. Clone this repository:

```bash
git clone <your-repo-url>
cd pondorasti
```

2. Build the executable:

```bash
swift build -c release
```

3. The executable will be located at:

```bash
.build/release/pondorasti
```

## Usage

### Run directly with Swift:

```bash
swift run
```

### Or build and run the binary:

```bash
swift build -c release
.build/release/pondorasti
```

### Install globally (optional):

```bash
swift build -c release
sudo cp .build/release/pondorasti /usr/local/bin/pondorasti
```

Then you can run it from anywhere:

```bash
pondorasti
```

## What It Does

1. **System Check**: Displays your macOS version
2. **Homebrew Setup**:
   - Checks if Homebrew is installed
   - Installs Homebrew if missing
   - Updates Homebrew to latest version
3. **Tool Installation**:
   - For each tool, shows name, category, and description
   - Installs tools that aren't present
   - Updates tools that are already installed
   - Shows clear success/failure status
4. **Summary**: Displays what was installed, updated, or failed

## Extending

To add more packages, edit `Sources/pondorasti/Homebrew/HomebrewPackage.swift` and add entries to the `defaultPackages` array:

```swift
HomebrewPackage(
    name: "package-name",
    formula: "brew-formula-name", // Optional, defaults to name
    description: "What this package does",
    category: .development, // or .monitoring, .utility, .productivity, .application
    isCask: false // true for GUI apps, false for CLI tools
)
```

## Requirements

- macOS 11.0 or later (Big Sur+)
- Apple Silicon Mac (M1, M2, M3, or newer)
- Swift 5.5 or later
- Internet connection (for downloading tools)

## Exit Codes

- `0`: Success - all operations completed successfully
- `1`: Failure - one or more operations failed

## Project Structure

```
Sources/pondorasti/
├── pondorasti.swift                 # Main entry point
├── ConsoleOutput.swift              # Terminal output formatting
└── Homebrew/                        # Homebrew-specific functionality
    ├── HomebrewManager.swift        # Homebrew installation and management
    ├── HomebrewPackage.swift        # Package definitions and configuration
    └── HomebrewPackageInstaller.swift # Package installation logic
```

## Future Enhancements

- Configuration file support (JSON/YAML)
- Installation profiles (minimal, developer, full)
- Integration with other package managers (Mac App Store, etc.)
- Dry-run mode for testing
- Support for more Homebrew Casks and custom taps
