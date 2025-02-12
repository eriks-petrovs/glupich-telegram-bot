import { Bot } from "grammy";
import config from "../utils/config";
import { SubscriberPost } from "./queueService";
import { InputMediaPhoto } from "grammy/types";

export async function checkBotAdminStatus(bot: Bot): Promise<boolean> {
  if (!config.channelId) {
    throw new Error("Channel ID is not configured.");
  }
  const chatAdmins = await bot.api.getChatAdministrators(config.channelId);
  const me = await bot.api.getMe();
  const isAdmin = chatAdmins.some((admin) => admin.user.id === me.id); 
  return isAdmin;
} 

export async function connectToChannel(bot: Bot): Promise<void> {
  if (!config.channelId) {
    console.warn("No channel ID configured. Skipping channel connection.");
    return;
  }
  try {
    const isAdmin = await checkBotAdminStatus(bot);
    if (!isAdmin) {
      console.warn("Bot is not an admin in the configured channel. Please add it as an administrator.");
    } else {
      console.log("Bot is connected to the channel and has admin privileges.");
    }
  } catch (error) {
    console.error("Error connecting to channel:", error);
  } 
}

export async function sendPostToChannel(bot: Bot, post: SubscriberPost): Promise<void> {
  if (!config.channelId) {
    throw new Error("Channel ID not configured.");
  }
  
  if (post.fileIds.length === 1) {
    await bot.api.sendPhoto(config.channelId, post.fileIds[0], { caption: post.caption });
  } else {
    const media: InputMediaPhoto[] = post.fileIds.map((fileId, index) => ({
      type: "photo",
      media: fileId,
      caption: index === 0 ? post.caption : undefined
    }));
    await bot.api.sendMediaGroup(config.channelId, media);
  }
}
