import { getConfig, setConfig } from "../db/database";

export function getAdminTags(): string[] {
  const value = getConfig("admin_tags");
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch (e) {
    return [];
  }
}

export function setAdminTags(tags: string[]): void {
  setConfig("admin_tags", JSON.stringify(tags));
}

export function getSubscriberTag(): string | undefined {
  return getConfig("subscriber_tag");
}

export function setSubscriberTag(tag: string): void {
  setConfig("subscriber_tag", tag);
}

export function getAdminPostThreshold(): number {
  const value = getConfig("admin_post_threshold");
  return value ? parseInt(value, 10) : 5; 
}

export function setAdminPostThreshold(threshold: number): void {
  setConfig("admin_post_threshold", threshold.toString());
}

export function getPostingDelay(): number {
  const value = getConfig("posting_delay");
  return value ? parseInt(value, 10) : 60; 
}

export function setPostingDelay(delay: number): void {
  setConfig("posting_delay", delay.toString());
}

export function getAdminPostCount(): number {
  const value = getConfig("admin_post_count");
  return value ? parseInt(value, 10) : 0;
}

export function setAdminPostCount(count: number): void {
  setConfig("admin_post_count", count.toString());
}

export function incrementAdminPostCount(): number {
  const current = getAdminPostCount();
  const newCount = current + 1;
  setAdminPostCount(newCount);
  return newCount;
}

export function getSubmitPermission(): string {
  const value = getConfig("submit_permission");
  return value ? value : "public"; 
}

export function setSubmitPermission(perm: string): void {
  setConfig("submit_permission", perm);
}
