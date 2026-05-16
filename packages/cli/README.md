# Pondorasti CLI

Mission control for pondorasti - a command-line tool for automated macOS setup and configuration.

Built with [Bun](https://bun.sh) and [Yargs](https://yargs.js.org/).

## Features

- Homebrew bundle management for formulae, casks, and Mac App Store apps
- Smart GitHub cloning into `~/repos/<owner>/<repo>`
- Dotfile symlink management with conflict backups
- macOS defaults and Dock setup commands
- Standalone Apple Silicon binary with embedded Brewfiles and dotfiles

## Fresh Machine Setup

On a brand new Mac, download and run the standalone binary:

```bash
# Download the binary (Apple Silicon)
curl -fsSL https://github.com/pondorasti/pondorasti/releases/latest/download/pd-darwin-arm64 -o pd
chmod +x pd

# Run the full bootstrap (installs Homebrew, then all packages from Brewfile)
./pd bootstrap
```

The compiled binary includes the Brewfiles and dotfiles, so it can bootstrap before the repository is cloned locally.

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
bun packages/cli/src/index.ts <command>

# Or install globally
bun link
pondorasti <command>
# or use the short alias
pd <command>
```

## Usage

### Commands

#### `bootstrap` - Bootstrap a fresh machine

Installs Oh My Zsh, Homebrew packages, Mac App Store apps, clones this repository, links dotfiles, applies defaults, and links `pd` from source.

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

Use `--no-open` to skip opening the cloned repo in Cursor.

#### `brew` - Manage Homebrew

```bash
# Install Homebrew
pd brew install

# Run brew bundle from Brewfile
pd brew bundle

# Install Mac App Store apps from Brewfile.mas
pd brew mas
```

#### `dotfiles` - Manage symlinked dotfiles

Packages currently include Claude, Cursor, Git, Neovim, OpenCode, tmux, and zsh.

```bash
# Show dotfile status
pd dotfiles status

# Link all packages
pd dotfiles link

# Link one package
pd dotfiles link nvim

# Backup and replace conflicting files
pd dotfiles link --force

# Remove symlinks
pd dotfiles unlink
```

#### `defaults` - Manage macOS defaults

```bash
pd defaults list
pd defaults status
pd defaults apply
```

#### `dock` - Manage the Dock

```bash
pd dock clear
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

The build script removes stale `dist` output before compiling and cleans up Bun's temporary `.bun-build` artifacts after signing. The compiled binary is about 60MB and requires no dependencies to run.

## Architecture

```
packages/cli/
├── src/
│   ├── index.ts           # CLI entry with yargs
│   ├── commands/          # Command implementations
│   │   ├── brew.ts        # Homebrew management
│   │   ├── clone.ts       # GitHub repo cloning
│   │   ├── defaults.ts    # macOS defaults
│   │   ├── dock.ts        # Dock management
│   │   ├── dotfiles.ts    # Dotfile symlink management
│   │   └── bootstrap.ts   # Fresh machine bootstrap
│   ├── tools/             # External tool wrappers
│   │   ├── defaults.ts    # defaults command wrapper
│   │   ├── dock.ts        # Dock defaults wrapper
│   │   ├── dotfiles.ts    # Symlink operations
│   │   ├── homebrew.ts    # Homebrew operations
│   │   └── ohmyzsh.ts     # Oh My Zsh installer
│   └── utils/             # Utilities
│       ├── cli-helpers.ts # CLI utilities
│       └── github.ts      # GitHub URL parsing
├── Brewfile               # Package definitions (embedded in binary)
├── Brewfile.mas           # Mac App Store apps
├── dotfiles/              # Dotfiles embedded in binary and linked by command
└── package.json           # Project configuration
```

## License

MIT
