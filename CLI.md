# Pondorasti

🖥️ Mission control for pondorasti - A command-line tool for automated macOS setup and configuration.

Built with [Bun](https://bun.sh), [Yargs](https://yargs.js.org/) for command parsing, and [Ink](https://github.com/vadimdemedes/ink) for rich terminal UI when needed.

## Features

- 🍺 **Homebrew Management**: Install, update, and manage Homebrew packages
- 📦 **Native Output**: Shows real brew output for transparency
- 🎨 **Rich UI**: Available for commands that benefit from it
- 🚀 **Fast**: Powered by Bun for blazing-fast execution
- 🔧 **Extensible**: Easy to add new commands

## Prerequisites

- macOS (optimized for Apple Silicon)
- [Bun](https://bun.sh) runtime

## Installation

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/pondorasti/pondorasti.git
cd pondorasti

# Install dependencies
bun install

# Run commands
bun run src/index.ts <command>

# Or install globally
bun link
pondorasti <command>
```

## Usage

### Commands

#### `brew` - Manage Homebrew

```bash
# Install Homebrew (if needed) and run brew bundle
pondorasti brew

# Just install Homebrew
pondorasti brew install

# Run brew bundle without installing Homebrew
pondorasti brew bundle

# Check Homebrew status
pondorasti brew status
```

### Global Options

```bash
--help, -h      Show help
--version       Show version
--dry-run       Simulate actions without making changes
--verbose, -v   Enable verbose output
```

## Brewfile

The `Brewfile` in your project root defines which packages to install. It supports:

- `brew` - Command-line tools and libraries
- `cask` - GUI applications
- `mas` - Mac App Store applications

Example:

```ruby
# Development Tools
brew "neovim"
brew "tmux"
brew "fzf"

# Applications
cask "visual-studio-code"
cask "firefox"

# Mac App Store
mas "Xcode", id: 497799835
```

## Development

```bash
# Run in development mode
bun dev

# Run tests
bun test

# Build for production
bun build --compile --outfile=pondorasti src/index.ts
```

## Architecture

```
pondorasti/
├── src/
│   ├── index.ts           # CLI entry with yargs
│   ├── commands/          # Command implementations
│   │   └── brew.ts       # Homebrew management
│   ├── managers/          # Business logic
│   │   └── homebrew.ts   # Homebrew operations
│   └── utils/            # Utilities
│       └── logger.ts     # File logging
├── Brewfile              # Package definitions
└── package.json          # Project configuration
```

## Future Commands

- `dotfiles` - Manage dotfiles and configurations
- `macos` - Configure macOS system preferences
- `setup` - Full system setup wizard

## Logging

Installation logs are saved to `~/.pondorasti/install.log`

View logs:

```bash
tail -f ~/.pondorasti/install.log
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
