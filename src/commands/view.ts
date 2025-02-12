import { Bot } from "grammy";
import { listQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";
import { InputMediaPhoto } from "grammy/types";

export function registerViewCommand(bot: Bot) {
  bot.command("view", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      if (args.length === 0) {
        await ctx.reply("Usage: /view <queue position>");
        return;
      }
      const pos = parseInt(args[0], 10);
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
      if (post.fileIds.length === 1) {
        await ctx.replyWithPhoto(post.fileIds[0], { caption: post.caption });
      } else {
        const media: InputMediaPhoto[] = post.fileIds.map((fileId, index) => ({
          type: "photo",
          media: fileId,
          caption: index === 0 ? post.caption : undefined
        }));
        await ctx.replyWithMediaGroup(media);
      }
    });
  });
}
