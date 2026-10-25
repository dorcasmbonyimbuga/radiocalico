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

// Tracked locally: DatabaseSync#isOpen only exists from Node 22.15 (undefined on older 22.x)
let open = true;

// Idempotent close, safe to call several times (e.g. on repeated shutdown signals)
export function closeDb() {
  if (!open) return;
  open = false;
  try {
    db.close();
  } catch (err) {
    // Already closed elsewhere through db.close(): nothing left to do
    if (err.code !== 'ERR_INVALID_STATE') throw err;
  }
}
