# Pondorasti CLI

🖥️ Mission control for pondorasti - A command-line tool for automated macOS setup and configuration.

Built with [Bun](https://bun.sh), [Yargs](https://yargs.js.org/) for command parsing, and [Ink](https://github.com/vadimdemedes/ink) for rich terminal UI when needed.

## Features

- 🍺 **Homebrew Management**: Install, update, and manage Homebrew packages
- 📂 **Smart Cloning**: Clone GitHub repos to organized `~/repos/<owner>/<repo>` structure
- 📦 **Standalone Binary**: Compiles to a single executable with embedded Brewfile
- 🚀 **Fresh Machine Setup**: Bootstrap a new Mac with a single command
- 🔧 **Extensible**: Easy to add new commands

## Fresh Machine Setup

On a brand new Mac, download and run the standalone binary:

```bash
# Download the binary (Apple Silicon)
curl -fsSL https://github.com/pondorasti/pondorasti/releases/latest/download/pd-darwin-arm64 -o pd
chmod +x pd

# Run the full bootstrap (installs Homebrew, then all packages from Brewfile)
./pd bootstrap
```

The compiled binary includes the Brewfile embedded, so it works without any dependencies.

## Installation (Development)

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/pondorasti/pondorasti.git
cd pondorasti

# Install dependencies
bun install

# Run commands directly
bun run packages/cli/src/index.ts <command>

# Or install globally
bun link
pondorasti <command>
# or use the short alias
pd <command>
```

## Usage

### Commands

#### `bootstrap` - Bootstrap a fresh machine

Installs Homebrew and runs brew bundle (which installs everything including Bun):

```bash
pd bootstrap
```

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

## Building

### Standalone Binary

The CLI compiles to a standalone executable that includes the Bun runtime and embedded Brewfile:

```bash
cd packages/cli

# Build for current platform
bun run build
```

The compiled binary is ~57MB and requires no dependencies to run.

## Architecture

```
packages/cli/
├── src/
│   ├── index.ts           # CLI entry with yargs
│   ├── commands/          # Command implementations
│   │   ├── brew.ts        # Homebrew management
│   │   ├── clone.ts       # GitHub repo cloning
│   │   └── bootstrap.ts   # Fresh machine bootstrap
│   ├── tools/             # External tool wrappers
│   │   ├── homebrew.ts    # Homebrew operations
│   │   └── bun.ts         # Bun runtime operations
│   └── utils/             # Utilities
│       ├── brewfile.ts    # Brewfile embedding & extraction
│       ├── cli-helpers.ts # CLI utilities
│       └── github.ts      # GitHub URL parsing
├── Brewfile               # Package definitions (embedded in binary)
└── package.json           # Project configuration
```

## License

MIT
