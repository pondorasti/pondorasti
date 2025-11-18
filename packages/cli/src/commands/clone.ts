import type { CommandModule } from "yargs"
import { $ } from "bun"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

const cloneCommand: CommandModule<{}, { url: string }> = {
  command: "clone <url>",
  describe: "Clone a GitHub repository to ~/repos/<owner>/<repo>",
  builder: (yargs) => {
    return yargs.positional("url", {
      describe: "GitHub repository URL",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (argv) => {
    const { url } = argv

    // Parse GitHub URL to extract owner and repo
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/, // Handles https and SSH formats
      /^([^/]+)\/([^/.]+)(\.git)?$/, // Handles owner/repo format
    ]

    let owner: string | null = null
    let repo: string | null = null

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        owner = match[1]
        repo = match[2]
        break
      }
    }

    if (!owner || !repo) {
      console.error("✗ Invalid GitHub URL format")
      console.error("  Expected formats:")
      console.error("    https://github.com/owner/repo")
      console.error("    git@github.com:owner/repo.git")
      console.error("    owner/repo")
      process.exit(1)
    }

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
      console.log(`\ncd ${targetDir}`)
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
      console.log(`\nRun: cd ${targetDir}`)
    } catch (error) {
      console.error(`\n✗ Failed to clone repository`)
      process.exit(1)
    }
  },
}

export default cloneCommand
