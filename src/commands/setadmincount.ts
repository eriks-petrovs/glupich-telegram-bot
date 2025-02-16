import { Bot } from "grammy";
import { setAdminPostCount } from "../services/configService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerSetAdminCountCommand(bot: Bot): void {
  bot.command("setadmincount", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      if (args.length !== 1) {
        await ctx.reply("Usage: /setadmincount <number>");
        return;
      }
      const count = parseInt(args[0], 10);
      if (isNaN(count)) {
        await ctx.reply("Please provide a valid number.");
        return;
      }
      setAdminPostCount(count);
      await ctx.reply(`Admin post count updated to ${count}.`);
    });
  });
}
