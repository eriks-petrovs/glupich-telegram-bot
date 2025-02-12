import type { Message } from "grammy/types";
import { 
  insertSubmission, 
  listPendingSubmissions, 
  listLatestSubmissions as dbListLatestSubmissions,
  updateSubmissionStatus, 
  getSubmissionById, 
  SubmissionRow 
} from "../db/database";

export interface SubscriberPost {
  id: string;
  fileIds: string[];
  caption?: string;
  from: number;
  fromUsername?: string;
  fromFirstName?: string;
  createdAt: string;
  status: string; // "pending", "published", "removed"
}

export function addToQueue(post: Omit<SubscriberPost, "status">): number {
  insertSubmission(post);
  return countPendingSubmissions();
}

export function countPendingSubmissions(): number {
  return listPendingSubmissions().length;
}

export function listQueue(): SubscriberPost[] {
  const rows = listPendingSubmissions();
  return rows.map(row => ({
    id: row.id,
    fileIds: JSON.parse(row.fileIds),
    caption: row.caption ?? undefined,
    from: row.fromUser,
    fromUsername: row.fromUsername ?? undefined,
    fromFirstName: row.fromFirstName ?? undefined,
    createdAt: row.createdAt,
    status: row.status
  }));
}

export function listLatestSubmissions(limit: number): SubscriberPost[] {
  const rows = dbListLatestSubmissions(limit);
  return rows.map((row: SubmissionRow) => ({
    id: row.id,
    fileIds: JSON.parse(row.fileIds),
    caption: row.caption ?? undefined,
    from: row.fromUser,
    fromUsername: row.fromUsername ?? undefined,
    fromFirstName: row.fromFirstName ?? undefined,
    createdAt: row.createdAt,
    status: row.status
  }));
}

export function removeFromQueue(id: string): boolean {
  // Mark submission as removed, but keep the record for later review.
  return updateSubmissionStatus(id, "removed");
}

export function publishSubmission(id: string): boolean {
  // Mark submission as published.
  return updateSubmissionStatus(id, "published");
}

export function getPostById(id: string): SubscriberPost | undefined {
  const row = getSubmissionById(id);
  if (!row) return undefined;
  return {
    id: row.id,
    fileIds: JSON.parse(row.fileIds),
    caption: row.caption ?? undefined,
    from: row.fromUser,
    createdAt: row.createdAt,
    status: row.status
  };
}

export type SubmissionCallback = (position: number) => void;

const mediaGroupCache: {
  [mediaGroupId: string]: {
    fileIds: string[];
    caption?: string;
    from: number;
    createdAt: string;
    timer?: NodeJS.Timeout;
    callback?: SubmissionCallback;
  };
} = {};

export function addMediaGroupMessage(message: Message, onComplete: SubmissionCallback) {
  const mediaGroupId = message.media_group_id;
  if (!mediaGroupId || !message.photo) return;
  const photo = message.photo[message.photo.length - 1];
  const fileId = photo.file_id;
  if (!mediaGroupCache[mediaGroupId]) {
    mediaGroupCache[mediaGroupId] = {
      fileIds: [],
      caption: message.caption || "",
      from: message.from?.id || 0,
      createdAt: new Date().toISOString(),
      callback: onComplete
    };
    mediaGroupCache[mediaGroupId].timer = setTimeout(() => {
      const post = {
        id: Date.now().toString(),
        fileIds: mediaGroupCache[mediaGroupId].fileIds,
        caption: mediaGroupCache[mediaGroupId].caption,
        from: mediaGroupCache[mediaGroupId].from,
        createdAt: mediaGroupCache[mediaGroupId].createdAt,
      };
      const position = addToQueue(post);
      mediaGroupCache[mediaGroupId].callback?.(position);
      delete mediaGroupCache[mediaGroupId];
    }, 1000);
  }
  mediaGroupCache[mediaGroupId].fileIds.push(fileId);
}

