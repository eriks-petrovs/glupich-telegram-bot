import { Bot } from "grammy";

export function registerHelpCommand(bot: Bot) {
  bot.command("help", (ctx) => {
    const helpMessage = `
Available commands:
/help - Show this help message
/submit - Submit your photo(s) for the channel
/queue - List subscriber post queue (admin only)
/remove - Remove a queued post (admin only)
/view - View a queued post by ID or position
/pull - Pull the first post from the queue to the channel
/config - Configure bot settings (admin tags, subscriber tag, admin post threshold, posting delay)
    `;
    ctx.reply(helpMessage);
  });
}