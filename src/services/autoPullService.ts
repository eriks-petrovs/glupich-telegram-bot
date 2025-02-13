// GlupichBot/src/services/autoPullService.ts
import { Bot } from "grammy";
import {
  getAdminTags,
  getSubscriberTag,
  getAdminPostThreshold,
  getPostingDelay,
  getAdminPostCount,
  setAdminPostCount,
  getTimezone,
  getPostingStart,
  getPostingEnd,
} from "../services/configService";
import { listQueue, removeFromQueue, SubscriberPost } from "../services/queueService";
import { sendPostToChannel } from "./channelService";
import { logger } from "../utils/logger";

let lastChannelPostTime = Date.now();
let scheduledPullTimer: NodeJS.Timeout | null = null;

// Helper to convert current time in the configured timezone to minutes since midnight.
function getCurrentTimeInMinutes(timezone: string): number {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
  const now = new Date(nowStr);
  return now.getHours() * 60 + now.getMinutes();
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper to compute the next allowed posting time (Date) based on postingStart in the configured timezone.
function getNextAllowedPostingTime(timezone: string, postingStart: string): Date {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
  const nowInTZ = new Date(nowStr);
  const [startHour, startMinute] = postingStart.split(":").map(Number);
  let nextAllowed = new Date(nowInTZ);
  nextAllowed.setHours(startHour, startMinute, 0, 0);
  if (nextAllowed.getTime() <= nowInTZ.getTime()) {
    nextAllowed.setDate(nextAllowed.getDate() + 1);
  }
  return nextAllowed;
}

async function attemptAutoPull(bot: Bot): Promise<void> {
  const currentTime = Date.now();
  const delayMs = getPostingDelay() * 60000;
  const threshold = getAdminPostThreshold();
  const adminCount = getAdminPostCount();
  const elapsed = currentTime - lastChannelPostTime;
  logger.debug(
    `AutoPull Check: adminCount=${adminCount}, threshold=${threshold}, elapsed=${elapsed}ms, requiredDelay=${delayMs}ms`
  );

  const timezone = getTimezone();
  const currentMinutes = getCurrentTimeInMinutes(timezone);
  const startMinutes = parseTimeToMinutes(getPostingStart());
  const endMinutes = parseTimeToMinutes(getPostingEnd());
  let withinWindow = false;
  if (startMinutes < endMinutes) {
    withinWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    withinWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  if (!withinWindow) {
    const nextAllowedTime = getNextAllowedPostingTime(timezone, getPostingStart());
    const delayUntilAllowed = nextAllowedTime.getTime() - Date.now();
    logger.info(`AutoPull: Outside posting window. Next allowed posting at ${nextAllowedTime.toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}.`);
    if (scheduledPullTimer) {
      clearTimeout(scheduledPullTimer);
      scheduledPullTimer = null;
    }
    scheduledPullTimer = setTimeout(() => {
      scheduledPullTimer = null;
      attemptAutoPull(bot).catch(err =>
        logger.error("Scheduled AutoPull error: " + err)
      );
    }, delayUntilAllowed);
    return;
  }

  if (adminCount >= threshold && elapsed >= delayMs) {
    const queue = listQueue();
    if (queue.length > 0) {
      const post: SubscriberPost = queue[0];
      try {
        logger.info(`AutoPull: Conditions met. Publishing post ID ${post.id}`);
        await sendPostToChannel(bot, post);
        removeFromQueue(post.id);
        lastChannelPostTime = Date.now();
        setAdminPostCount(0);
        logger.info("AutoPull: Post published successfully. Counters reset.");
      } catch (err) {
        logger.error("AutoPull: Failed to send post: " + err);
      }
      if (scheduledPullTimer) {
        clearTimeout(scheduledPullTimer);
        scheduledPullTimer = null;
      }
    } else {
      logger.info("AutoPull: Conditions met but queue is empty.");
      if (scheduledPullTimer) {
        clearTimeout(scheduledPullTimer);
        scheduledPullTimer = null;
      }
    }
  } else {
    if (adminCount >= threshold) {
      const remainingDelay = delayMs - elapsed;
      if (remainingDelay > 0 && !scheduledPullTimer) {
        logger.debug(`AutoPull: Scheduling pull in ${remainingDelay}ms.`);
        scheduledPullTimer = setTimeout(() => {
          scheduledPullTimer = null;
          attemptAutoPull(bot).catch(err =>
            logger.error("Scheduled AutoPull error: " + err)
          );
        }, remainingDelay);
      }
    } else {
      if (scheduledPullTimer) {
        clearTimeout(scheduledPullTimer);
        scheduledPullTimer = null;
      }
      logger.debug("AutoPull: Admin count below threshold; waiting for more admin posts.");
    }
  }
}

export function registerAutoPull(bot: Bot): void {
  attemptAutoPull(bot).catch(err => logger.error("Initial AutoPull error: " + err));

  bot.on("channel_post", async (ctx) => {
    lastChannelPostTime = Date.now();
    const text = ((ctx.channelPost?.text || "") + " " + (ctx.channelPost?.caption || "")).toLowerCase();
    const adminTags = getAdminTags().map(tag => tag.toLowerCase());
    const subscriberTag = getSubscriberTag()?.toLowerCase() || "";
    const isAdmin = adminTags.some(tag => text.includes(tag));
    const isSubscriber = subscriberTag ? text.includes(subscriberTag) : false;
    
    if (isAdmin) {
      setAdminPostCount(getAdminPostCount() + 1);
      logger.info(`AutoPull: Admin post detected. New admin count: ${getAdminPostCount()}`);
    }
    if (isSubscriber) {
      setAdminPostCount(0);
      logger.info("AutoPull: Subscriber post detected. Admin count reset.");
    }
    await attemptAutoPull(bot);
  });
}

export function getAutoPullStatusDetailed() {
  const threshold = getAdminPostThreshold();
  const delayMs = getPostingDelay() * 60000;
  const elapsed = Date.now() - lastChannelPostTime;
  const adminCount = getAdminPostCount();
  const postsRemaining = Math.max(0, threshold - adminCount);
  const timeRemainingMs = Math.max(0, delayMs - elapsed);
  const timeRemainingMinutes = Math.ceil(timeRemainingMs / 60000);
  
  const timezone = getTimezone();
  const currentMinutes = getCurrentTimeInMinutes(timezone);
  const startMinutes = parseTimeToMinutes(getPostingStart());
  const endMinutes = parseTimeToMinutes(getPostingEnd());
  let withinWindow = false;
  if (startMinutes < endMinutes) {
    withinWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    withinWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  let nextAllowedTime: string | null = null;
  if (!withinWindow) {
    const nextAllowed = getNextAllowedPostingTime(timezone, getPostingStart());
    nextAllowedTime = nextAllowed.toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  }
  
  return {
    adminPostCount: adminCount,
    lastChannelPostTime,
    postsRemaining,
    timeRemainingMs,
    timeRemainingMinutes,
    threshold,
    delayMinutes: getPostingDelay(),
    postingWindowOpen: withinWindow,
    nextAllowedTime,
  };
}
