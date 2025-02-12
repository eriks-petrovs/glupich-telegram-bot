import { Bot } from "grammy";
import config from "./utils/config";
import { logger } from "./utils/logger";
import { registerCommands } from "./commands";
import { connectToChannel } from "./services/channelService";
import { registerAutoPull } from "./services/autoPullService";

// Helper function to determine the update type
function getUpdateType(ctx: any): string {
  if (ctx.update.message) return "message";
  if (ctx.update.edited_message) return "edited_message";
  if (ctx.update.channel_post) return "channel_post";
  if (ctx.update.edited_channel_post) return "edited_channel_post";
  return "unknown";
}

export async function createBot() {
  const bot = new Bot(config.botToken);

  // Detailed logging middleware for every update.
  bot.use(async (ctx, next) => {
    let details = `Received update of type: ${getUpdateType(ctx)}`;
    if (ctx.message) {
      details += `, message_id: ${ctx.message.message_id}`;
      if (ctx.message.text) {
        details += `, text: "${ctx.message.text}"`;
      }
      if (ctx.message.photo) {
        const photoIds = ctx.message.photo.map((p) => p.file_id).join(", ");
        details += `, photo file_ids: [${photoIds}]`;
      }
    } else if (ctx.channelPost) {
      details += `, channel_post_id: ${ctx.channelPost.message_id}`;
      if (ctx.channelPost.text) {
        details += `, text: "${ctx.channelPost.text}"`;
      }
      if (ctx.channelPost.photo) {
        const photoIds = ctx.channelPost.photo.map((p) => p.file_id).join(", ");
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

  // Middleware to ignore commands from non-private chats.
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text || ctx.channelPost?.text || "";
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
    { command: "queue", description: "List subscriber post queue" },
    { command: "remove", description: "Remove a queued post" },
    { command: "view", description: "View a queued post by ID or position" },
    { command: "pull", description: "Pull the first post from the queue to the channel" },
    { command: "config", description: "Configure bot settings" },
    { command: "status", description: "Display auto-pull status and queue info" },
    { command: "latest", description: "Display latest submissions" }
  ]);

  await connectToChannel(bot);
  registerAutoPull(bot);

  return bot;
}
