import { PLAYLIST } from '../data/playlist.js';
import { getRatingSummary, setVote } from '../db/ratings.repository.js';
import { HttpError } from '../middleware/errors.js';
import { getNowPlaying } from './now-playing.service.js';

const VALID_VALUES = new Set([-1, 0, 1]);

function assertSongExists(songId) {
  if (!PLAYLIST.some((s) => s.id === songId)) throw new HttpError(404, 'Song not found');
}

export function getRating(songId, voterId) {
  assertSongExists(songId);
  return getRatingSummary(songId, voterId);
}

// Only the song currently on air can be rated
export function rateSong(songId, voterId, value) {
  assertSongExists(songId);
  if (!VALID_VALUES.has(value)) throw new HttpError(400, 'value must be 1, -1 or 0');
  if (getNowPlaying().song.id !== songId) {
    throw new HttpError(409, 'This song is no longer playing');
  }
  setVote(songId, voterId, value);
  return getRatingSummary(songId, voterId);
}
