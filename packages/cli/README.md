# Pondorasti CLI

🖥️ Mission control for pondorasti - A command-line tool for automated macOS setup and configuration.

Built with [Bun](https://bun.sh), [Yargs](https://yargs.js.org/) for command parsing, and [Ink](https://github.com/vadimdemedes/ink) for rich terminal UI when needed.

## Features

- 🍺 **Homebrew Management**: Install, update, and manage Homebrew packages
- 📂 **Smart Cloning**: Clone GitHub repos to organized `~/repos/<owner>/<repo>` structure
- 📦 **Native Output**: Shows real brew output for transparency
- 🚀 **Fast**: Powered by Bun for blazing-fast execution
- 🔧 **Extensible**: Easy to add new commands

## Prerequisites

- macOS (optimized for Apple Silicon)
- [Bun](https://bun.sh) runtime
- [GitHub CLI](https://cli.github.com/) (`gh`) for clone command

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
bun run packages/cli/src/index.ts <command>

# Or install globally
bun link
pondorasti <command>
# or use the short alias
pd <command>
```

## Usage

### Commands

#### `clone` - Clone GitHub repositories

Clones repositories to `~/repos/<owner>/<repo>` and opens a shell in the directory.

```bash
# Clone using various URL formats
pd clone https://github.com/owner/repo
pd clone git@github.com:owner/repo.git
pd clone owner/repo

# Also works with tree/blob URLs (branch/file paths are stripped)
pd clone https://github.com/owner/repo/tree/main
pd clone https://github.com/owner/repo/blob/main/src/file.ts
```

#### `brew` - Manage Homebrew

```bash
# Install Homebrew
pd brew install

# Run brew bundle from Brewfile
pd brew bundle
```

### Global Options

```bash
--help, -h      Show help
--version, -v   Show version
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
packages/cli/
├── src/
│   ├── index.ts           # CLI entry with yargs
│   ├── commands/          # Command implementations
│   │   ├── brew.ts        # Homebrew management
│   │   └── clone.ts       # GitHub repo cloning
│   ├── tools/             # External tool wrappers
│   │   └── homebrew.ts    # Homebrew operations
│   └── utils/             # Utilities
│       ├── cli-helpers.ts # CLI utilities
│       ├── github.ts      # GitHub URL parsing
│       └── github.test.ts # Tests for GitHub utils
├── Brewfile               # Package definitions (at repo root)
└── package.json           # Project configuration
```

## Future Commands

- `dotfiles` - Manage dotfiles and configurations
- `macos` - Configure macOS system preferences
- `setup` - Full system setup wizard

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
