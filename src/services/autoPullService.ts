import { Bot } from "grammy";
import {
  getAdminTags,
  getSubscriberTag,
  getAdminPostThreshold,
  getPostingDelay,
  getAdminPostCount,
  setAdminPostCount
} from "../services/configService";
import { listQueue, removeFromQueue, SubscriberPost } from "../services/queueService";
import { sendPostToChannel } from "./channelService";
import { logger } from "../utils/logger";

let lastChannelPostTime = Date.now();
let scheduledPullTimer: NodeJS.Timeout | null = null;

async function attemptAutoPull(bot: Bot): Promise<void> {
  const currentTime = Date.now();
  const delayMs = getPostingDelay() * 60000;
  const threshold = getAdminPostThreshold();
  const adminCount = getAdminPostCount();

  logger.debug(
    `AutoPull Check: adminCount=${adminCount}, threshold=${threshold}, elapsed=${currentTime - lastChannelPostTime}ms, requiredDelay=${delayMs}ms`
  );

  if (adminCount >= threshold && (currentTime - lastChannelPostTime) >= delayMs) {
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
      // Cancel any scheduled timer once a pull occurs.
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
    // If admin count is sufficient but the delay condition is not met, schedule a one-shot timer.
    if (adminCount >= threshold) {
      const remainingDelay = getPostingDelay() * 60000 - (currentTime - lastChannelPostTime);
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
      // If the admin count is below threshold, cancel any pending timer.
      if (scheduledPullTimer) {
        clearTimeout(scheduledPullTimer);
        scheduledPullTimer = null;
      }
      logger.debug("AutoPull: Admin count below threshold; waiting for more admin posts.");
    }
  }
}

export function registerAutoPull(bot: Bot): void {
  // Initial check on bot load.
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
  return {
    adminPostCount: adminCount,
    lastChannelPostTime,
    postsRemaining,
    timeRemainingMs,
    timeRemainingMinutes,
    threshold,
    delayMinutes: getPostingDelay()
  };
}
