import { Bot } from "grammy";

export function registerHelpCommand(bot: Bot) {
  bot.command("help", (ctx) => {
    const helpMessage = `
Available commands:
/help - Show this help message
/submit - Submit your photo(s) for the channel
/myposts - View your pending submissions
/queue - List the subscriber submission queue
/remove - Remove a submission from the queue
/view - View a submission by its queue position
/viewid - View a submission by its unique ID
/pull - Pull the first submission from the queue to the channel
/config - Configure bot settings
/status - Display auto-pull status and queue info
/latest - Display the latest submissions
    `;
    ctx.reply(helpMessage);
  });
}