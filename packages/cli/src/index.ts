#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import brewCommand from "./commands/brew"
import cloneCommand from "./commands/clone"
import { failHandler } from "./utils/cli-helpers"

yargs(hideBin(process.argv))
  .scriptName("pondorasti")
  .usage("$0 <command> [options]")
  .command(brewCommand)
  .command(cloneCommand)
  .demandCommand(1)
  .recommendCommands()
  .strict()
  .version()
  .alias("v", "version")
  .help()
  .alias("h", "help")
  .epilogue("For more information, visit https://github.com/pondorasti/pondorasti/blob/main/packages/cli/README.md")
  .fail(failHandler)
  .parse()
