import { Bot } from "grammy";
import { sendPostToChannel } from "../services/channelService";
import { listQueue, removeFromQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerPullCommand(bot: Bot) {
  bot.command("pull", async (ctx) => {
    await adminOnly(ctx, async () => {
      const queue = listQueue();
      if (queue.length === 0) {
        await ctx.reply("The queue is empty.");
        return;
      }
      const post = queue[0];
      try {
        await sendPostToChannel(bot, post);
        removeFromQueue(post.id);
        await ctx.reply(`Post with ID ${post.id} has been sent to the channel.`);
      } catch (err) {
        await ctx.reply(`Failed to send post to the channel: ${err}`);
      }
    });
  });
}
