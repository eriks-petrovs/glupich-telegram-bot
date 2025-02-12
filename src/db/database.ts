import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export interface SubmissionRow {
  id: string;
  fileIds: string;  // stored as JSON
  caption: string | null;
  fromUser: number;
  fromUsername: string | null;
  fromFirstName: string | null;
  createdAt: string;
  status: string;   // "pending", "published", "removed"
}

const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "queue.sqlite");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    fileIds TEXT NOT NULL,
    caption TEXT,
    fromUser INTEGER NOT NULL,
    fromUsername TEXT,
    fromFirstName TEXT,
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export function insertSubmission(submission: {
  id: string;
  fileIds: string[];
  caption?: string;
  from: number;
  fromUsername?: string;
  fromFirstName?: string;
  createdAt: string;
}): void {
  const stmt = db.prepare(`
    INSERT INTO submissions (id, fileIds, caption, fromUser, fromUsername, fromFirstName, createdAt, status)
    VALUES (@id, @fileIds, @caption, @fromUser, @fromUsername, @fromFirstName, @createdAt, 'pending')
  `);
  stmt.run({
    id: submission.id,
    fileIds: JSON.stringify(submission.fileIds),
    caption: submission.caption || null,
    fromUser: submission.from,
    fromUsername: submission.fromUsername || null,
    fromFirstName: submission.fromFirstName || null,
    createdAt: submission.createdAt,
  });
}

export function listPendingSubmissions(): SubmissionRow[] {
  const stmt = db.prepare(`SELECT * FROM submissions WHERE status = 'pending' ORDER BY createdAt ASC`);
  return stmt.all() as SubmissionRow[];
}

export function updateSubmissionStatus(id: string, status: string): boolean {
  const stmt = db.prepare(`UPDATE submissions SET status = ? WHERE id = ?`);
  const info = stmt.run(status, id);
  return info.changes > 0;
}

export function listLatestSubmissions(limit: number): SubmissionRow[] {
  const stmt = db.prepare("SELECT * FROM submissions ORDER BY createdAt DESC LIMIT ?");
  return stmt.all(limit) as SubmissionRow[];
}

export function getSubmissionById(id: string): SubmissionRow | undefined {
  const stmt = db.prepare(`SELECT * FROM submissions WHERE id = ?`);
  return stmt.get(id) as SubmissionRow | undefined;
}

export function getConfig(key: string): string | undefined {
  const stmt = db.prepare("SELECT value FROM config WHERE key = ?");
  const row = stmt.get(key) as { value: string } | undefined;
  return row ? row.value : undefined;
}

export function setConfig(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, value);
}
