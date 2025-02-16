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

// Returns current time in minutes since midnight for the given timezone.
function getCurrentTimeInMinutes(timezone: string): number {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
  const now = new Date(nowStr);
  return now.getHours() * 60 + now.getMinutes();
}

// Converts a HH:MM string into minutes since midnight.
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Checks if the current time (in the given timezone) is within the allowed posting window.
function isWithinPostingWindow(timezone: string): boolean {
  const currentMinutes = getCurrentTimeInMinutes(timezone);
  const startMinutes = parseTimeToMinutes(getPostingStart());
  const endMinutes = parseTimeToMinutes(getPostingEnd());
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// Computes delay (in ms) until posting window opens.
function getDelayUntilWindowOpens(timezone: string): number {
  const currentMinutes = getCurrentTimeInMinutes(timezone);
  const startMinutes = parseTimeToMinutes(getPostingStart());
  let minutesUntil = currentMinutes < startMinutes
    ? startMinutes - currentMinutes
    : (24 * 60 - currentMinutes) + startMinutes;
  return minutesUntil * 60000;
}

// Returns true if auto-pull conditions are met.
function shouldPublish(adminCount: number, elapsed: number, delayMs: number, threshold: number): boolean {
  return adminCount >= threshold && elapsed >= delayMs;
}

// Schedules a one-shot timer to re-check auto-pull conditions.
function schedulePull(bot: Bot, delay: number): void {
  if (scheduledPullTimer) clearTimeout(scheduledPullTimer);
  scheduledPullTimer = setTimeout(() => {
    scheduledPullTimer = null;
    attemptAutoPull(bot).catch(err => logger.error("Scheduled AutoPull error: " + err));
  }, delay);
}

export async function attemptAutoPull(bot: Bot): Promise<void> {
  const currentTime = Date.now();
  const delayMs = getPostingDelay() * 60000;
  const threshold = getAdminPostThreshold();
  const adminCount = getAdminPostCount();
  const elapsed = currentTime - lastChannelPostTime;
  logger.debug(`AutoPull Check: adminCount=${adminCount}, threshold=${threshold}, elapsed=${elapsed}ms, requiredDelay=${delayMs}ms`);

  const timezone = getTimezone();
  if (!isWithinPostingWindow(timezone)) {
    const delayUntilAllowed = getDelayUntilWindowOpens(timezone);
    logger.info(`AutoPull: Outside posting window. Next allowed posting in ${Math.ceil(delayUntilAllowed/60000)} minute(s).`);
    schedulePull(bot, delayUntilAllowed);
    return;
  }

  if (shouldPublish(adminCount, elapsed, delayMs, threshold)) {
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
      return;
    } else {
      logger.info("AutoPull: Conditions met but queue is empty.");
      if (scheduledPullTimer) {
        clearTimeout(scheduledPullTimer);
        scheduledPullTimer = null;
      }
      return;
    }
  } else {
    if (adminCount >= threshold) {
      const remainingDelay = delayMs - elapsed;
      if (remainingDelay > 0 && !scheduledPullTimer) {
        logger.debug(`AutoPull: Scheduling pull in ${remainingDelay}ms.`);
        schedulePull(bot, remainingDelay);
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
    const nextAllowed = getNextAllowedPostingTime(timezone);
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

// Helper to compute the next allowed posting time (Date) based on postingStart.
function getNextAllowedPostingTime(timezone: string): Date {
  const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
  const nowInTZ = new Date(nowStr);
  const [startHour, startMinute] = getPostingStart().split(":").map(Number);
  let nextAllowed = new Date(nowInTZ);
  nextAllowed.setHours(startHour, startMinute, 0, 0);
  if (nextAllowed.getTime() <= nowInTZ.getTime()) {
    nextAllowed.setDate(nextAllowed.getDate() + 1);
  }
  return nextAllowed;
}
