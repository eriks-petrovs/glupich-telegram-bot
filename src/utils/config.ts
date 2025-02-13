import dotenv from "dotenv";
dotenv.config();

export default {
  botToken: process.env.BOT_TOKEN || "",
  adminPostThreshold: parseInt(process.env.ADMIN_POST_THRESHOLD || "5", 10),
  postingDelay: parseInt(process.env.POSTING_DELAY || "60", 10), // in minutes
  channelId: process.env.CHANNEL_ID || "",
  defaultAdminTags: process.env.DEFAULT_ADMIN_TAGS
    ? process.env.DEFAULT_ADMIN_TAGS.split(",").map(tag => tag.trim())
    : [],
  defaultSubscriberTag: process.env.DEFAULT_SUBSCRIBER_TAG || "",
  defaultSubmitPermission: process.env.DEFAULT_SUBMIT_PERMISSION || "public",
  botName: process.env.BOT_NAME || "Glupich Bot",
  timezone: process.env.TIMEZONE || "UTC",
};
