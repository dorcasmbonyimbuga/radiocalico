import { db } from './index.js';

const statements = {
  summary: db.prepare(`
    SELECT
      COALESCE(SUM(value = 1), 0)  AS up,
      COALESCE(SUM(value = -1), 0) AS down
    FROM ratings WHERE song_id = ?`),
  voterValue: db.prepare('SELECT value FROM ratings WHERE song_id = ? AND voter_id = ?'),
  upsert: db.prepare(`
    INSERT INTO ratings (song_id, voter_id, value) VALUES (?, ?, ?)
    ON CONFLICT (song_id, voter_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`),
  remove: db.prepare('DELETE FROM ratings WHERE song_id = ? AND voter_id = ?'),
};

export function getRatingSummary(songId, voterId) {
  const { up, down } = statements.summary.get(songId);
  const mine = voterId ? statements.voterValue.get(songId, voterId) : undefined;
  return { songId, up, down, myVote: mine?.value ?? 0 };
}

// value: 1 (thumbs up), -1 (thumbs down) or 0 (remove the vote)
export function setVote(songId, voterId, value) {
  if (value === 0) statements.remove.run(songId, voterId);
  else statements.upsert.run(songId, voterId, value);
}
