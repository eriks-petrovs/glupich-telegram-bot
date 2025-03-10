import { Bot } from "grammy";
import { getAutoPullStatusDetailed } from "../services/autoPullService";
import { listQueue } from "../services/queueService";
import { adminOnly } from "../middlewares/adminCheck";
import { getTimezone } from "../services/configService";

export function registerStatusCommand(bot: Bot) {
  bot.command("status", async (ctx) => {
    await adminOnly(ctx, async () => {
      const queueLength = listQueue().length;
      const status = getAutoPullStatusDetailed();
      let message = `Subscriber Queue: ${queueLength} post(s)\n\n`;
      
      if (queueLength === 0) {
        message += "No subscriber posts waiting for publication.";
      } else if (status.adminPostCount < status.threshold) {
        const postsNeeded = status.threshold - status.adminPostCount;
        message += `Admin Posts: ${status.adminPostCount} / ${status.threshold}\n` +
                   `Need ${postsNeeded} more admin post(s) to trigger auto-pull.`;
      } else {
        if (!status.postingWindowOpen) {
          message += `Currently outside posting hours. Next allowed posting time: ${status.nextAllowedTime} (${getTimezone()}).`;
        } else if (status.timeRemainingMs > 0) {
          const nextPostTime = new Date(Date.now() + status.timeRemainingMs)
            .toLocaleTimeString("en-US", { timeZone: getTimezone() });
          message += `Admin threshold met (${status.adminPostCount} / ${status.threshold}).\n` +
                     `Waiting for delay: ~${status.timeRemainingMinutes} minute(s) (estimated at ${nextPostTime}).`;
        } else {
          message += "All conditions are met. The next subscriber post will be published immediately.";
        }
      }
      
      await ctx.reply(message);
    });
  });
}
