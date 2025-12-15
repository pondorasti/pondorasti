// -------------------------------------------------------------------------------------------------------------------
// Dock Class
// -------------------------------------------------------------------------------------------------------------------

class Dock {
  static clear(): void {
    // Clear all pinned apps from the Dock
    Bun.spawnSync(["defaults", "write", "com.apple.dock", "persistent-apps", "-array"])
    // Restart Dock to apply changes
    Bun.spawnSync(["killall", "Dock"])
  }
}

export { Dock }




