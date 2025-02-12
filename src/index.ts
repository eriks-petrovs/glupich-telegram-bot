import { createBot } from "./bot";
import { logger } from "./utils/logger";

(async () => {
  try {
    const bot = await createBot();
    await bot.start();
    logger.info("Bot is up and running...");
  } catch (err) {
    logger.error("Failed to start bot: " + err);
  }
})();