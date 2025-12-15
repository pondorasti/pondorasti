import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { $ } from "bun"

class OhMyZsh {
  static readonly PATH = path.join(os.homedir(), ".oh-my-zsh")
  static readonly INSTALL_URL = "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh"

  static isInstalled(): boolean {
    return fs.existsSync(this.PATH)
  }

  static async install(): Promise<void> {
    if (this.isInstalled()) {
      console.log(`✓ Oh My Zsh is already installed at ${this.PATH}`)
      return
    }

    console.log("Installing Oh My Zsh...")
    // --unattended prevents interactive prompts and doesn't change the default shell
    await $`sh -c "$(curl -fsSL ${this.INSTALL_URL})" "" --unattended`
    console.log("✓ Oh My Zsh installed")
  }
}

export { OhMyZsh }



