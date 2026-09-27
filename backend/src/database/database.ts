import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { APP_PATHS } from '../config/paths';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(APP_PATHS.database);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(APP_PATHS.database);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recent_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_path TEXT NOT NULL,
      file_path TEXT NOT NULL,
      opened_at TEXT DEFAULT (datetime('now')),
      UNIQUE(workspace_path, file_path)
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
