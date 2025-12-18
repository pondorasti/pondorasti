import type { CommandModule } from "yargs"
import { $, spawn } from "bun"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import { parseGitHubUrl } from "../utils/github"

const openShell = async (cwd: string) => {
  console.log(`\nOpening shell in ${cwd}...`)
  const shell = process.env.SHELL || "/bin/zsh"
  const proc = spawn([shell], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  await proc.exited
}

const cloneCommand: CommandModule<{}, { url: string; open: boolean }> = {
  command: "clone <url>",
  describe: "Clone a GitHub repository to ~/repos/<owner>/<repo>",
  builder: (yargs) => {
    return yargs
      .positional("url", {
        describe: "GitHub repository URL",
        type: "string",
        demandOption: true,
      })
      .option("open", {
        alias: "o",
        describe: "Open the repository in Cursor after cloning",
        type: "boolean",
        default: false,
      })
  },
  handler: async (argv) => {
    const { url, open } = argv

    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      console.error("✗ Invalid GitHub URL format")
      console.error("  Expected formats:")
      console.error("    https://github.com/owner/repo")
      console.error("    git@github.com:owner/repo.git")
      console.error("    owner/repo")
      process.exit(1)
    }

    const { owner, repo } = parsed

    // Check if gh CLI is installed
    try {
      await $`which gh`.quiet()
    } catch {
      console.error("✗ GitHub CLI (gh) is not installed")
      console.error("  Install with: brew install gh")
      process.exit(1)
    }

    // Construct the target directory
    const reposDir = path.join(os.homedir(), "repos", owner)
    const targetDir = path.join(reposDir, repo)

    // Check if repo already exists
    if (fs.existsSync(targetDir)) {
      console.log(`✓ Repository already exists at ${targetDir}`)
      if (open) {
        console.log(`Opening Cursor...`)
        await $`cursor ${targetDir}`.quiet()
      }
      await openShell(targetDir)
      return
    }

    // Create the parent directory if it doesn't exist
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true })
    }

    // Clone the repository using gh CLI
    console.log(`Cloning ${owner}/${repo}...`)
    try {
      await $`gh repo clone ${owner}/${repo} ${targetDir}`
      console.log(`\n✓ Successfully cloned to ${targetDir}`)
      if (open) {
        console.log(`Opening Cursor...`)
        await $`cursor ${targetDir}`.quiet()
      }
      await openShell(targetDir)
    } catch (error) {
      console.error(`\n✗ Failed to clone repository`)
      process.exit(1)
    }
  },
}

// -------------------------------------------------------------------------------------------------------------------

export { cloneCommand }
