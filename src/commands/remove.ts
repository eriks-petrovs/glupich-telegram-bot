import { Bot } from "grammy";
import { removeFromQueue, listQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerRemoveCommand(bot: Bot) {
  bot.command("remove", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      if (args.length === 0) {
        await ctx.reply("Usage: /remove id <postId> OR /remove <position>");
        return;
      }
      let success = false;
      if (args[0] === "id") {
        if (args.length < 2) {
          await ctx.reply("Usage: /remove id <postId>");
          return;
        }
        const postId = args[1];
        success = removeFromQueue(postId);
        await ctx.reply(success ? `Post with ID ${postId} removed from the queue.` : `No post found with ID ${postId}.`);
      } else {
        let pos: number;
        if (args[0] === "pos") {
          if (args.length < 2) {
            await ctx.reply("Usage: /remove pos <position>");
            return;
          }
          pos = parseInt(args[1], 10);
        } else {
          pos = parseInt(args[0], 10);
        }
        if (isNaN(pos) || pos < 1) {
          await ctx.reply("Please provide a valid queue position (number starting from 1).");
          return;
        }
        const queue = listQueue();
        if (pos > queue.length) {
          await ctx.reply(`Position ${pos} is out of range. The queue has ${queue.length} posts.`);
          return;
        }
        const post = queue[pos - 1];
        success = removeFromQueue(post.id);
        await ctx.reply(success ? `Post at position ${pos} (ID: ${post.id}) removed from the queue.` : `Failed to remove the post at position ${pos}.`);
      }
    });
  });
}
