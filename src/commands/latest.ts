import { Bot } from "grammy";
import { listLatestSubmissions } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerLatestCommand(bot: Bot) {
  bot.command("latest", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      let limit = 5;
      if (args.length > 0) {
        const parsed = parseInt(args[0], 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = parsed;
        }
      }
      const submissions = listLatestSubmissions(limit);
      if (submissions.length === 0) {
        await ctx.reply("No submissions found.");
        return;
      }
      let message = "Latest submissions:\n";
      submissions.forEach((sub, index) => {
        const userDisplay = sub.fromUsername
          ? `${sub.fromUsername} (ID: ${sub.from})`
          : `User ID: ${sub.from}`;
        message += `${index + 1}. ID: ${sub.id}, From: ${userDisplay}, Status: ${sub.status}, Submitted: ${new Date(sub.createdAt).toLocaleString()}\n`;
      });
      await ctx.reply(message);
    });
  });
}