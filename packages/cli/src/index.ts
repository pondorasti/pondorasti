#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { initializeLogging, closeLogging } from "./utils/logger"
import brewCommand from "./commands/brew"

// Initialize logging for all commands
initializeLogging()

// Handle cleanup on exit
process.on("SIGINT", () => {
  closeLogging()
  process.exit(0)
})

process.on("SIGTERM", () => {
  closeLogging()
  process.exit(0)
})

// Main CLI setup
const argv = yargs(hideBin(process.argv))
  .scriptName("pondorasti")
  .usage("$0 <command> [options]")
  .option("dry-run", {
    type: "boolean",
    description: "Simulate actions without making changes",
    global: true,
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Enable verbose output",
    global: true,
  })
  .command(brewCommand)
  .demandCommand(1, "You need at least one command")
  .recommendCommands()
  .strict()
  .version()
  .help()
  .alias("h", "help")
  .epilogue("For more information, visit https://github.com/pondorasti/pondorasti/blob/main/CLI.md")
  .fail((msg, err, yargs) => {
    if (err) {
      console.error("Error:", err.message)
    } else {
      console.error(msg)
      console.log()
      yargs.showHelp()
    }
    closeLogging()
    process.exit(1)
  }).argv

// Clean exit after successful execution
closeLogging()
