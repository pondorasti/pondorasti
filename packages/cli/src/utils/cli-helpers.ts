import type { Argv } from "yargs"

function failHandler(msg: string | undefined | null, err: Error | undefined, yargs: Argv) {
  // Handle the case where no command/subcommand was provided
  if (!err && (!msg || msg.includes("Not enough non-option arguments"))) {
    yargs.showHelp("log")
    process.exit(0)
  }

  // Handle unknown arguments - show error in red but help in normal color
  if (!err && msg && msg.includes("Unknown argument")) {
    console.error(msg)
    console.log()
    yargs.showHelp("log")
    process.exit(1)
  }

  // Handle "Did you mean X?" suggestions - show in normal color since it's helpful
  if (!err && msg && msg.includes("Did you mean")) {
    console.log(msg)
    console.log()
    yargs.showHelp("log")
    process.exit(1)
  }

  if (err) {
    console.error("Error:", err.message)
  } else if (msg) {
    console.error(msg)
    console.log()
    yargs.showHelp("error")
  }
  process.exit(1)
}

export { failHandler }
