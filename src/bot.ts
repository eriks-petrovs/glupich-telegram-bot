import { Bot } from "grammy";
import config from "./utils/config";
import { logger } from "./utils/logger";
import { registerCommands } from "./commands";
import { connectToChannel } from "./services/channelService";
import { registerAutoPull } from "./services/autoPullService";

function getUpdateType(ctx: any): string {
  if (ctx.update.message) return "message";
  if (ctx.update.edited_message) return "edited_message";
  if (ctx.update.channel_post) return "channel_post";
  if (ctx.update.edited_channel_post) return "edited_channel_post";
  return "unknown";
}

export async function createBot(): Promise<Bot> {
  const bot = new Bot(config.botToken);

  bot.use(async (ctx, next) => {
    let details = `Received update: ${getUpdateType(ctx)}`;
    if (ctx.message) {
      details += `, message_id: ${ctx.message.message_id}`;
      if (ctx.message.text) details += `, text: "${ctx.message.text}"`;
      if (ctx.message.photo) {
        const photoIds = ctx.message.photo.map((p: any) => p.file_id).join(", ");
        details += `, photo file_ids: [${photoIds}]`;
      }
    } else if (ctx.channelPost) {
      details += `, channel_post_id: ${ctx.channelPost.message_id}`;
      if (ctx.channelPost.text) details += `, text: "${ctx.channelPost.text}"`;
      if (ctx.channelPost.photo) {
        const photoIds = ctx.channelPost.photo.map((p: any) => p.file_id).join(", ");
        details += `, photo file_ids: [${photoIds}]`;
      }
    }
    logger.info(details);
    try {
      await next();
      logger.info("Update processed successfully.");
    } catch (error) {
      logger.error("Error processing update: " + error);
    }
  });

  // Ignore commands from non-private chats.
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text || "";
    if (text.startsWith("/") && ctx.chat && ctx.chat.type !== "private") {
      logger.info(`Skipping command processing for chat type: ${ctx.chat.type}`);
      return;
    }
    return next();
  });

  registerCommands(bot);

  await bot.api.setMyCommands([
    { command: "help", description: "Show help message" },
    { command: "submit", description: "Submit your photo(s) for the channel" },
    { command: "myposts", description: "View your pending submissions" },
    { command: "queue", description: "List the subscriber submission queue" },
    { command: "remove", description: "Remove a submission from the queue" },
    { command: "view", description: "View a submission by its queue position" },
    { command: "viewid", description: "View a submission by its unique ID" },
    { command: "pull", description: "Pull the first submission from the queue to the channel" },
    { command: "config", description: "Configure bot settings" },
    { command: "status", description: "Display auto-pull status and queue info" },
    { command: "latest", description: "Display the latest submissions" },
    { command: "setadmincount", description: "Manually set admin post count" }
  ]);

  await connectToChannel(bot);
  registerAutoPull(bot);

  return bot;
}
