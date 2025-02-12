import { Context } from "grammy";
import config from "../utils/config";
import { logger } from "../utils/logger";

export async function adminOnly(ctx: Context, next: () => Promise<void>): Promise<void> {
  const channelId = config.channelId;
  if (!channelId) {
    logger.error("No channel ID configured.");
    await ctx.reply("Bot configuration error: channel not set.");
    return;
  }
  if (!ctx.from) {
    await ctx.reply("Unable to identify you.");
    return;
  }
  try {
    const admins = await ctx.api.getChatAdministrators(channelId);
    const adminIds = admins.map(member => member.user.id);
    if (adminIds.includes(ctx.from.id)) {
      await next();
    } else {
      await ctx.reply("You are not authorized to use this command.");
    }
  } catch (err) {
    logger.error("Error in adminOnly middleware: " + err);
    await ctx.reply("An error occurred while checking your permissions.");
  }
}
