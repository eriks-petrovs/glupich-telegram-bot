import { Bot } from "grammy";
import { getPostById } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";
import { InputMediaPhoto } from "grammy/types";

export function registerViewIdCommand(bot: Bot) {
  bot.command("viewid", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      if (args.length < 1) {
        await ctx.reply("Usage: /viewid <submissionId>");
        return;
      }
      const submissionId = args[0];
      const post = getPostById(submissionId);
      if (!post) {
        await ctx.reply(`No submission found with ID ${submissionId}.`);
        return;
      }
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
