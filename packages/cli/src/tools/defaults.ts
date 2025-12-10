// -------------------------------------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------------------------------------

type DefaultType = "bool" | "int" | "float" | "string" | "dict"

interface BaseDefault {
  domain: string
  key: string
  description: string
}

interface SimpleDefault extends BaseDefault {
  type: "bool" | "int" | "float" | "string"
  value: boolean | number | string
}

interface DictDefault extends BaseDefault {
  type: "dict"
  value: Record<string, string | number | boolean>
}

type Default = SimpleDefault | DictDefault

interface DefaultStatus {
  def: Default
  current: unknown
  matches: boolean
}

interface ApplyResult {
  applied: Default[]
  skipped: Default[]
  errors: Array<{ def: Default; error: string }>
}

// -------------------------------------------------------------------------------------------------------------------
// Defaults Class
// -------------------------------------------------------------------------------------------------------------------

class Defaults {
  static readonly config: Default[] = [
    // Language & Region
    {
      domain: "NSGlobalDomain",
      key: "AppleTemperatureUnit",
      type: "string",
      value: "Celsius",
      description: "Temperature unit - Celsius",
    },
    {
      domain: "NSGlobalDomain",
      key: "AppleMeasurementUnits",
      type: "string",
      value: "Centimeters",
      description: "Measurement system - Metric",
    },
    {
      domain: "NSGlobalDomain",
      key: "AppleMetricUnits",
      type: "bool",
      value: true,
      description: "Use metric units",
    },
    {
      domain: "NSGlobalDomain",
      key: "AppleFirstWeekday",
      type: "dict",
      value: { gregorian: 2 },
      description: "First day of week - Monday",
    },

    // Keyboard
    {
      domain: "NSGlobalDomain",
      key: "KeyRepeat",
      type: "int",
      value: 2,
      description: "Key repeat rate - Fast",
    },
    {
      domain: "NSGlobalDomain",
      key: "InitialKeyRepeat",
      type: "int",
      value: 15,
      description: "Delay until repeat - Short",
    },
    {
      domain: "NSGlobalDomain",
      key: "ApplePressAndHoldEnabled",
      type: "bool",
      value: false,
      description: "Disable press-and-hold for accent characters, enable key repeat",
    },

    // Desktop & Dock
    {
      domain: "com.apple.dock",
      key: "minimize-to-application",
      type: "bool",
      value: true,
      description: "Minimize windows into application icon",
    },
    {
      domain: "com.apple.dock",
      key: "autohide",
      type: "bool",
      value: true,
      description: "Automatically hide and show the Dock",
    },
    {
      domain: "com.apple.dock",
      key: "show-recents",
      type: "bool",
      value: false,
      description: "Show suggested and recent apps in Dock",
    },
    {
      domain: "com.apple.dock",
      key: "magnification",
      type: "bool",
      value: true,
      description: "Enable Dock magnification",
    },
    {
      domain: "com.apple.dock",
      key: "largesize",
      type: "float",
      value: 70,
      description: "Dock magnification size",
    },
  ]

  static read(domain: string, key: string): string | null {
    try {
      const result = Bun.spawnSync(["defaults", "read", domain, key])

      if (result.exitCode === 0 && result.stdout) {
        return result.stdout.toString().trim()
      }
    } catch {}

    return null
  }

  static write(def: Default): { success: boolean; error?: string } {
    try {
      let args: string[]

      if (def.type === "dict") {
        // Build dict arguments: -dict key1 value1 key2 value2 ...
        const dictArgs: string[] = []
        for (const [k, v] of Object.entries(def.value)) {
          dictArgs.push(k, String(v))
        }
        args = ["defaults", "write", def.domain, def.key, "-dict", ...dictArgs]
      } else {
        const typeFlag = `-${def.type}`
        const valueStr = String(def.value)
        args = ["defaults", "write", def.domain, def.key, typeFlag, valueStr]
      }

      const result = Bun.spawnSync(args)

      if (result.exitCode !== 0) {
        const stderr = result.stderr?.toString().trim() || "Unknown error"
        return { success: false, error: stderr }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  private static parseValue(output: string, type: DefaultType): unknown {
    const trimmed = output.trim()

    switch (type) {
      case "bool":
        return trimmed === "1" || trimmed.toLowerCase() === "true"
      case "int":
        return parseInt(trimmed, 10)
      case "float":
        return parseFloat(trimmed)
      case "string":
        return trimmed
      case "dict":
        // Parse dict output like: { gregorian = 2; }
        const dict: Record<string, string | number> = {}
        const matches = trimmed.matchAll(/(\w+)\s*=\s*([^;]+)/g)
        for (const match of matches) {
          const key = match[1]
          const value = match[2].trim().replace(/^"|"$/g, "")
          // Try to parse as number
          const num = Number(value)
          dict[key] = isNaN(num) ? value : num
        }
        return dict
      default:
        return trimmed
    }
  }

  private static valuesMatch(current: unknown, desired: Default): boolean {
    if (desired.type === "dict") {
      if (typeof current !== "object" || current === null) return false
      const currentDict = current as Record<string, unknown>
      const desiredDict = desired.value
      for (const [key, value] of Object.entries(desiredDict)) {
        if (currentDict[key] !== value) return false
      }
      return true
    }

    return current === desired.value
  }

  static getStatus(): DefaultStatus[] {
    return this.config.map((def) => {
      const rawValue = this.read(def.domain, def.key)
      const current = rawValue !== null ? this.parseValue(rawValue, def.type) : null
      const matches = current !== null && this.valuesMatch(current, def)

      return { def, current, matches }
    })
  }

  static apply(): ApplyResult {
    const applied: Default[] = []
    const skipped: Default[] = []
    const errors: Array<{ def: Default; error: string }> = []

    for (const def of this.config) {
      const rawValue = this.read(def.domain, def.key)
      const current = rawValue !== null ? this.parseValue(rawValue, def.type) : null
      const matches = current !== null && this.valuesMatch(current, def)

      if (matches) {
        skipped.push(def)
        continue
      }

      const result = this.write(def)
      if (result.success) {
        applied.push(def)
      } else {
        errors.push({ def, error: result.error || "Unknown error" })
      }
    }

    return { applied, skipped, errors }
  }

  static formatValue(value: unknown): string {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value)
    }
    return String(value)
  }
}

export { Defaults }
