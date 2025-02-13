import { Bot } from "grammy";
import { listQueue } from "../services/queueService";
import { InputMediaPhoto } from "grammy/types";

export function registerMyPostsCommand(bot: Bot) {
  bot.command("myposts", async (ctx) => {
    if (!ctx.from) return;
    const userId = ctx.from.id;
    const queue = listQueue(); // Returns submissions sorted by createdAt (ascending)
    const userPosts = queue.filter(post => post.from === userId);
    if (userPosts.length === 0) {
      await ctx.reply("You have no submissions in the queue.");
      return;
    }
    for (const post of userPosts) {
      // Determine the submission's position in the overall queue.
      const position = queue.findIndex(p => p.id === post.id) + 1;
      await ctx.reply(`Submission ID ${post.id} is at position ${position} in the queue.`);
      if (post.fileIds.length === 1) {
        await ctx.replyWithPhoto(post.fileIds[0], { caption: post.caption });
      } else {
        const media: InputMediaPhoto[] = post.fileIds.map((fileId, index) => ({
          type: "photo",
          media: fileId,
          caption: index === 0 ? post.caption : undefined,
        }));
        await ctx.replyWithMediaGroup(media);
      }
    }
  });
}
