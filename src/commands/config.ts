import { Bot } from "grammy";
import {
  getAdminTags,
  setAdminTags,
  getSubscriberTag,
  setSubscriberTag,
  getAdminPostThreshold,
  setAdminPostThreshold,
  getPostingDelay,
  setPostingDelay,
  getSubmitPermission,
  setSubmitPermission
} from "../services/configService";
import { adminOnly } from "../middlewares/adminCheck";

export function registerConfigCommands(bot: Bot) {
  bot.command("config", async (ctx) => {
    await adminOnly(ctx, async () => {
      const args = ctx.message?.text.split(" ").slice(1) || [];
      if (args.length === 0) {
        await ctx.reply(
          "Usage:\n" +
          "/config show\n" +
          "/config set <key> <value...>\n" +
          "Valid keys: admintags, subscribertag, adminpostthreshold, postingdelay, submitpermission"
        );
        return;
      }
      const action = args[0].toLowerCase();
      if (action === "show") {
        const adminTags = getAdminTags();
        const subscriberTag = getSubscriberTag();
        const adminPostThreshold = getAdminPostThreshold();
        const postingDelay = getPostingDelay();
        const submitPermission = getSubmitPermission();
        await ctx.reply(
          `Current configuration:\n` +
          `Admin Tags: ${adminTags.join(", ") || "not set"}\n` +
          `Subscriber Tag: ${subscriberTag || "not set"}\n` +
          `Admin Post Threshold: ${adminPostThreshold}\n` +
          `Posting Delay (minutes): ${postingDelay}\n` +
          `Submit Permission: ${submitPermission}`
        );
      } else if (action === "set") {
        if (args.length < 3) {
          await ctx.reply("Usage: /config set <key> <value...>");
          return;
        }
        const key = args[1].toLowerCase();
        const values = args.slice(2);
        switch (key) {
          case "admintags":
            setAdminTags(values);
            await ctx.reply(`Admin tags updated: ${values.join(", ")}`);
            break;
          case "subscribertag":
            if (values.length !== 1) {
              await ctx.reply("Usage: /config set subscribertag <tag>");
              return;
            }
            setSubscriberTag(values[0]);
            await ctx.reply(`Subscriber tag updated: ${values[0]}`);
            break;
          case "adminpostthreshold": {
            const threshold = parseInt(values[0], 10);
            if (isNaN(threshold)) {
              await ctx.reply("Please provide a valid number for admin post threshold.");
              return;
            }
            setAdminPostThreshold(threshold);
            await ctx.reply(`Admin post threshold updated: ${threshold}`);
            break;
          }
          case "postingdelay": {
            const delay = parseInt(values[0], 10);
            if (isNaN(delay)) {
              await ctx.reply("Please provide a valid number for posting delay (in minutes).");
              return;
            }
            setPostingDelay(delay);
            await ctx.reply(`Posting delay updated: ${delay} minutes`);
            break;
          }
          case "submitpermission": {
            if (values.length !== 1) {
              await ctx.reply("Usage: /config set submitpermission <public|admin>");
              return;
            }
            const perm = values[0].toLowerCase();
            if (perm !== "public" && perm !== "admin") {
              await ctx.reply("Invalid value. Allowed values are 'public' or 'admin'.");
              return;
            }
            setSubmitPermission(perm);
            await ctx.reply(`Submit permission updated: ${perm}`);
            break;
          }
          default:
            await ctx.reply("Unknown configuration key. Valid keys: admintags, subscribertag, adminpostthreshold, postingdelay, submitpermission");
        }
      } else {
        await ctx.reply("Unknown action. Use `/config show` or `/config set <key> <value...>`");
      }
    });
  });
}
