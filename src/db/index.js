import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

if (config.dbFile !== ':memory:') mkdirSync(path.dirname(config.dbFile), { recursive: true });

// Single SQLite connection, shared by the repositories
export const db = new DatabaseSync(config.dbFile);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Idempotent schema, applied on startup
db.exec(readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8'));

export function sqliteVersion() {
  return db.prepare('SELECT sqlite_version() AS version').get().version;
}

export function closeDb() {
  if (db.isOpen) db.close();
}
