import { Bot } from "grammy";
import { getSubscriberTag, getBotName } from "../services/configService";

export function registerStartCommand(bot: Bot) {
  bot.command("start", (ctx) => {
    const subscriberTag = getSubscriberTag();
    const botName = getBotName();
    const message = `
Welcome to ${botName}!

This bot collects photo submissions for our channel.
To submit your photo(s), simply send them here. Please include the subscriber tag "${subscriberTag}" in your caption so that your submission is accepted.

For more information, type /help.
    `;
    ctx.reply(message.trim());
  });
}
