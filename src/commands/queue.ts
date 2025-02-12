import { Bot } from "grammy";
import { listQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerQueueCommand(bot: Bot) {
  bot.command("queue", async (ctx) => {
    await adminOnly(ctx, async () => {
      const posts = listQueue();
      if (posts.length === 0) {
        await ctx.reply("The queue is empty.");
        return;
      }
      const message = posts
        .map((post, index) => {
          const userInfo = post.fromUsername 
            ? `${post.fromUsername} (ID: ${post.from})` 
            : `User ID: ${post.from}`;
          return `${index + 1}. ID: ${post.id}, From: ${userInfo}, Caption: ${post.caption || "N/A"}`;
        })
        .join("\n");
      await ctx.reply(message);
    });
  });
}
