import * as fs from "fs"
import * as os from "os"
import { $ } from "bun"

// Embed the Brewfile directly into the compiled binary
// @ts-expect-error- Bun's file embedding syntax
import embeddedBrewfile from "../../Brewfile" with { type: "file" }

const BREW_PATH_M1 = "/opt/homebrew/bin/brew"

class Homebrew {
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

  private static async getBrewfile(): Promise<string> {
    const tempDir = `${os.tmpdir()}/pondorasti`
    const tempPath = `${tempDir}/Brewfile`

    fs.mkdirSync(tempDir, { recursive: true })
    fs.writeFileSync(tempPath, await Bun.file(embeddedBrewfile).text())

    return tempPath
  }

  static async install(): Promise<void> {
    if (this.isInstalled()) {
      console.log(`✓ Homebrew is already installed at ${this.getBrewPath()}`)
      await $`zsh -l -c "brew --version"`
      return
    }

    console.log("Installing Homebrew...")
    await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
    console.log("✓ Homebrew installed")
  }

  static async bundle(): Promise<void> {
    if (!this.isInstalled()) {
      throw new Error("Homebrew is not installed. Run 'pd brew install' first.")
    }

    const brewfilePath = await this.getBrewfile()
    console.log(`Using Brewfile: ${brewfilePath}\n`)
    await $`zsh -l -c "brew bundle --verbose --file=${brewfilePath}"`
  }
}

export { Homebrew }
