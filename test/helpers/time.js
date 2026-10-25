import { PLAYLIST } from '../../src/data/playlist.js';

export const CYCLE = PLAYLIST.reduce((sum, s) => sum + s.duration, 0);

// Timestamp (ms) at which song `id` has been playing for `elapsed` seconds
export function timeAt(id, elapsed = 0, cycle = 0) {
  let start = 0;
  for (const song of PLAYLIST) {
    if (song.id === id) return (cycle * CYCLE + start + elapsed) * 1000;
    start += song.duration;
  }
  throw new Error(`Song ${id} is not in the playlist`);
}
