import { Bot } from "grammy";
import { registerHelpCommand } from "./help";
import { registerSubmitHandler } from "./submit";
import { registerQueueCommand } from "./queue";
import { registerRemoveCommand } from "./remove";
import { registerViewCommand } from "./view";
import { registerPullCommand } from "./pull";
import { registerConfigCommands } from "./config";
import { registerStatusCommand } from "./status";
import { registerLatestCommand } from "./latest";
import { registerViewIdCommand } from "./viewid";

export function registerCommands(bot: Bot) {
  registerSubmitHandler(bot);
  registerHelpCommand(bot);
  registerQueueCommand(bot);
  registerRemoveCommand(bot);
  registerViewCommand(bot);
  registerPullCommand(bot);
  registerConfigCommands(bot);
  registerStatusCommand(bot);
  registerLatestCommand(bot);
  registerViewIdCommand(bot);
}
