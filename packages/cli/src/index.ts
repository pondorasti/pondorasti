#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import brewCommand from "./commands/brew"
import cloneCommand from "./commands/clone"
import defaultsCommand from "./commands/defaults"
import dockCommand from "./commands/dock"
import dotfilesCommand from "./commands/dotfiles"
import bootstrapCommand from "./commands/bootstrap"
import { failHandler } from "./utils/cli-helpers"

yargs(hideBin(process.argv))
  .scriptName("pondorasti")
  .usage("$0 <command> [options]")
  .command(bootstrapCommand)
  .command(brewCommand)
  .command(cloneCommand)
  .command(defaultsCommand)
  .command(dockCommand)
  .command(dotfilesCommand)
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
