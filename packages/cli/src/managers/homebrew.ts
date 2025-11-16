import * as fs from "fs"
import { $ } from "bun"

const BREW_PATH_M1 = "/opt/homebrew/bin/brew"

class HomebrewManager {
  private static brewPath: string | null = null

  static isInstalled(): boolean {
    if (fs.existsSync(BREW_PATH_M1)) {
      this.brewPath = BREW_PATH_M1
      return true
    }

    try {
      const result = Bun.spawnSync(["which", "brew"], { stdout: "pipe", stderr: "pipe" })

      if (result.exitCode === 0 && result.stdout) {
        this.brewPath = result.stdout.toString().trim()
        return true
      }
    } catch {}

    return false
  }

  static getBrewPath(): string | null {
    if (this.brewPath) {
      return this.brewPath
    }

    if (fs.existsSync(BREW_PATH_M1)) {
      this.brewPath = BREW_PATH_M1
      return this.brewPath
    }

    try {
      const result = Bun.spawnSync(["which", "brew"], { stdout: "pipe", stderr: "pipe" })

      if (result.exitCode === 0 && result.stdout) {
        this.brewPath = result.stdout.toString().trim()
        return this.brewPath
      }
    } catch {}

    return null
  }

  static async runBundle(): Promise<void> {
    await $`brew bundle`
  }
}

export { HomebrewManager }
