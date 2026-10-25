-- Initial schema (run on every startup, idempotent)
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Listener votes: one vote per listener (anonymous cookie) per song
CREATE TABLE IF NOT EXISTS ratings (
  song_id    INTEGER NOT NULL,
  voter_id   TEXT    NOT NULL,
  value      INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (song_id, voter_id)
);
