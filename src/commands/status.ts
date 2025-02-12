import { Bot } from "grammy";
import { getAutoPullStatusDetailed } from "../services/autoPullService";
import { listQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerStatusCommand(bot: Bot) {
  bot.command("status", async (ctx) => {
    await adminOnly(ctx, async () => {
      const queueLength = listQueue().length;
      let message = `Subscriber Queue: ${queueLength} post(s)\n\n`;
      if (queueLength === 0) {
        message += "No subscriber posts waiting for publication.";
      } else {
        const status = getAutoPullStatusDetailed();
        message += "Auto-Pull Status:\n";
        if (status.adminPostCount < status.threshold) {
          const postsNeeded = status.threshold - status.adminPostCount;
          message += `• Admin Posts: ${status.adminPostCount} / ${status.threshold}\n`;
          message += `  → ${postsNeeded} more admin post(s) required to trigger auto-pull.`;
        } else {
          if (status.timeRemainingMs > 0) {
            const nextPostTime = new Date(Date.now() + status.timeRemainingMs);
            message += `• Admin threshold met (${status.adminPostCount} / ${status.threshold}).\n`;
            message += `  → Waiting for delay: ~${status.timeRemainingMinutes} minute(s) (estimated at ${nextPostTime.toLocaleTimeString()}).`;
          } else {
            message += "• All conditions are met. The next subscriber post will be published immediately.";
          }
        }
      }
      await ctx.reply(message);
    });
  });
}
