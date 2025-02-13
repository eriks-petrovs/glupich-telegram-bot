import { getConfig, setConfig } from "../db/database";
import configDefaults from "../utils/config";

export function getAdminTags(): string[] {
  const value = getConfig("admin_tags");
  if (!value) return configDefaults.defaultAdminTags;
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export function setAdminTags(tags: string[]): void {
  setConfig("admin_tags", JSON.stringify(tags));
}

export function getSubscriberTag(): string {
  return getConfig("subscriber_tag") || configDefaults.defaultSubscriberTag;
}

export function setSubscriberTag(tag: string): void {
  setConfig("subscriber_tag", tag);
}

export function getAdminPostThreshold(): number {
  const value = getConfig("admin_post_threshold");
  return value ? parseInt(value, 10) : configDefaults.adminPostThreshold;
}

export function setAdminPostThreshold(threshold: number): void {
  setConfig("admin_post_threshold", threshold.toString());
}

export function getPostingDelay(): number {
  const value = getConfig("posting_delay");
  return value ? parseInt(value, 10) : configDefaults.postingDelay;
}

export function setPostingDelay(delay: number): void {
  setConfig("posting_delay", delay.toString());
}

export function getSubmitPermission(): string {
  return getConfig("submit_permission") || configDefaults.defaultSubmitPermission;
}

export function setSubmitPermission(perm: string): void {
  setConfig("submit_permission", perm);
}

export function getAdminPostCount(): number {
  const value = getConfig("admin_post_count");
  return value ? parseInt(value, 10) : 0;
}

export function setAdminPostCount(count: number): void {
  setConfig("admin_post_count", count.toString());
}

export function getBotName(): string {
  return getConfig("bot_name") || configDefaults.botName;
}

export function setBotName(name: string): void {
  setConfig("bot_name", name);
}
