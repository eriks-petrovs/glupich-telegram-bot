import { Bot } from "grammy";
import { attemptAutoPull } from "../services/autoPullService";
import { addToQueue, addMediaGroupMessage } from "../services/queueService";
import { getSubscriberTag, getSubmitPermission } from "../services/configService";
import { adminOnly } from "../middlewares/adminCheck";
import { logger } from "../utils/logger";

export function registerSubmitHandler(bot: Bot) {
  bot.on("message", async (ctx, next) => {
    if (ctx.message?.text && ctx.message.text.startsWith("/")) return next();
    if (!ctx.message?.photo && !ctx.message?.media_group_id) {
      await ctx.reply("Your submission must include at least one photo.");
      return;
    }
    const subscriberTag = getSubscriberTag();
    if (!subscriberTag) {
      await ctx.reply("Subscriber tag is not configured on the bot.");
      return;
    }
    // For media group messages, only check the caption if one is provided.
    if (ctx.message.media_group_id) {
      if (ctx.message.caption && !ctx.message.caption.toLowerCase().includes(subscriberTag.toLowerCase())) {
        await ctx.reply(`Your submission must include the subscriber tag "${subscriberTag}".`);
        return;
      }
      addMediaGroupMessage(ctx.message, async (position: number) => {
        await ctx.reply(`Your submission has been recorded. Current pending queue position: ${position}`);
      });
      return;
    }
    // For single photo submissions, require the subscriber tag.
    const caption = ctx.message.caption || "";
    if (!caption.toLowerCase().includes(subscriberTag.toLowerCase())) {
      await ctx.reply(`Your submission must include the subscriber tag "${subscriberTag}".`);
      return;
    }
    const submitPermission = getSubmitPermission();
    if (submitPermission === "admin") {
      await adminOnly(ctx, async () => {
        await processSubmission(ctx, bot);
      });
    } else {
      await processSubmission(ctx, bot);
    }
  });
}

async function processSubmission(ctx: any, bot: Bot) {
  const submissionData = {
    id: Date.now().toString(),
    fileIds: [] as string[],
    caption: ctx.message.caption || "", 
    from: ctx.from?.id || 0,
    fromUsername: ctx.from?.username || "",
    fromFirstName: ctx.from?.first_name || "",
    createdAt: new Date().toISOString()
  };

  if (ctx.message.media_group_id) {
    addMediaGroupMessage(ctx.message, async (position: number) => {
      await ctx.reply(`Your submission has been recorded. Current pending queue position: ${position}`);
    });
  } else if (ctx.message.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    submissionData.fileIds.push(photo.file_id);
    const position = addToQueue(submissionData);
    await ctx.reply(`Your submission has been recorded. Current pending queue position: ${position}`);
  }

  attemptAutoPull(bot).catch(err => logger.error("Error triggering auto-pull: " + err));
}