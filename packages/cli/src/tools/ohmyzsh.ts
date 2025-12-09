import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { $ } from "bun"

const OH_MY_ZSH_PATH = path.join(os.homedir(), ".oh-my-zsh")
const INSTALL_URL = "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh"

class OhMyZsh {
  static isInstalled(): boolean {
    return fs.existsSync(OH_MY_ZSH_PATH)
  }

  static async install(): Promise<void> {
    if (this.isInstalled()) {
      console.log(`✓ Oh My Zsh is already installed at ${OH_MY_ZSH_PATH}`)
      return
    }

    console.log("Installing Oh My Zsh...")
    // --unattended prevents interactive prompts and doesn't change the default shell
    await $`sh -c "$(curl -fsSL ${INSTALL_URL})" "" --unattended`
    console.log("✓ Oh My Zsh installed")
  }
}

export { OhMyZsh }



