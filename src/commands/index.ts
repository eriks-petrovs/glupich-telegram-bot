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
import { registerStartCommand } from "./start";
import { registerMyPostsCommand } from "./myposts";
import { registerSetAdminCountCommand } from "./setadmincount";

export function registerCommands(bot: Bot) {
  registerStartCommand(bot);
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
  registerMyPostsCommand(bot);
  registerSetAdminCountCommand(bot);
}
