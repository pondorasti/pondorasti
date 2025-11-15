# Pondorasti - macOS Setup CLI

A Swift-based command-line tool that automates the setup of a new macOS machine with essential developer tools and configurations.

## Features

- **Automated Homebrew Installation**: Checks for Homebrew and installs it if not present
- **Brewfile-based Package Management**: Uses Homebrew's native Brewfile format for declarative package management
- **Tool Installation/Updates**: Installs packages defined in the Brewfile using `brew bundle`
- **Beautiful Output**: Color-coded terminal output with clear status indicators
- **Apple Silicon Optimized**: Designed specifically for M1/M2/M3 and newer Macs
- **Automatic Lock Resolution**: Detects and resolves stuck Homebrew processes automatically
- **Extensible**: Easy to add new packages by editing the Brewfile
- **Future-Ready**: Placeholder for dotfiles management, system preferences, and more

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

# Get help
pondorasti --help
```

## Command Line Options

- `-h, --help` - Show help message

## Logging

All installation commands and their outputs are automatically logged to `~/.pondorasti/install.log`.

To monitor the installation progress in real-time:

```bash
tail -f ~/.pondorasti/install.log
```

## Troubleshooting

### Installation Appears Stuck

If the installation appears stuck (especially with packages like neovim that compile from source):

1. Check the log file to see what's happening:

   ```bash
   tail -f ~/.pondorasti/install.log
   ```

2. Some packages (like neovim) compile from source and can take 5-10 minutes

3. If needed, you can always install packages manually:
   ```bash
   brew install neovim
   ```

## What It Does

1. **System Check**: Displays your macOS version
2. **Homebrew Setup**:
   - Checks if Homebrew is installed
   - Installs Homebrew if missing
   - Updates Homebrew to latest version
3. **Package Installation**:
   - Runs `brew bundle` to install/update all packages defined in the Brewfile
   - Shows clear success/failure status
   - Suggests running `brew bundle cleanup` to remove unlisted packages

## Default Packages

The Brewfile includes these packages by default:

### CLI Tools

#### Development Tools

- **lazygit**: Terminal UI for git commands
- **lazydocker**: Terminal UI for Docker
- **neovim**: Modern Vim-based text editor
- **gh**: GitHub CLI
- **tmux**: Terminal multiplexer - multiple terminal sessions in one window
- **pnpm**: Fast, disk space efficient package manager for Node.js

#### System Monitoring

- **fastfetch**: System information tool
- **btop**: Resource monitor

#### Utilities

- **fzf**: Command-line fuzzy finder
- **ffmpeg**: Multimedia framework for converting audio, video, and streaming
- **mas**: Mac App Store command-line interface

### GUI Applications (Casks)

#### Terminal & Development

- **ghostty**: Fast, native terminal emulator
- **Visual Studio Code**: Powerful, extensible code editor
- **Cursor**: AI-powered code editor built to make you extraordinarily productive
- **Zed**: High-performance code editor designed for collaboration with humans and AI
- **Android Studio**: Official IDE for Android app development
- **TablePlus**: Modern database management tool
- **Xcode**: Apple's IDE for developing apps for Apple platforms (via Mac App Store)
- **WiFi Explorer**: WiFi network scanner and analyzer (via Mac App Store)

#### Productivity

- **Raycast**: Productivity launcher with extensions
- **1Password**: Password manager and secure wallet
- **CleanShot**: Advanced screenshot and screen recording tool
- **Flighty**: Live flight tracker with detailed flight data and notifications (via Mac App Store)

#### Communication

- **Slack**: Team communication and collaboration
- **Discord**: Voice, video, and text communication
- **WhatsApp Messenger**: Messaging app for text, voice, and video calls (via Mac App Store)

#### Browsers

- **Google Chrome**: Fast, secure web browser
- **Firefox**: Privacy-focused web browser
- **uBlock Origin Lite**: Lightweight ad blocker for Safari (via Mac App Store)

#### Design

- **Figma**: Collaborative design and prototyping tool
- **Sketch**: Native macOS design toolkit for UI/UX designers
- **PixelSnap**: Measure anything on your screen with pixel precision

#### Games

- **The Powder Toy**: Physics sandbox game - blow things up, simulate physics, build machines

## Extending

To add more packages, simply edit the `Brewfile`:

```ruby
# Add a formula (CLI tool)
brew "package-name"

# Add a cask (GUI application)
cask "app-name"

# Add a tap
tap "homebrew/cask-fonts"

# Add from Mac App Store (mas is already included in our Brewfile)
mas "App Name", id: 123456789

# Examples from our Brewfile:
mas "WhatsApp Messenger", id: 310633997
mas "Xcode", id: 497799835
```

For more Brewfile options, see the [Homebrew Bundle documentation](https://github.com/Homebrew/homebrew-bundle).

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
.
├── Brewfile                         # Homebrew package definitions
├── Package.swift                    # Swift package manifest
├── README.md                        # This file
└── Sources/pondorasti/
    ├── pondorasti.swift             # Main entry point
    ├── ConsoleOutput.swift          # Terminal output formatting
    └── Homebrew/
        └── HomebrewManager.swift    # Homebrew installation and management
```

## Future Enhancements

- Dotfiles management (automatic symlinking from git repository)
- macOS system preferences configuration
- Development environment setup (git config, ssh keys, etc.)
- Shell configuration (zsh plugins, aliases, etc.)
- Installation profiles (minimal, developer, full)
- Dry-run mode for testing
