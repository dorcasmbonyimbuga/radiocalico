import { PLAYLIST } from '../data/playlist.js';

const CYCLE = PLAYLIST.reduce((sum, s) => sum + s.duration, 0);

const toTrack = ({ colors, ...song }) => ({ ...song, cover: `/covers/${song.id}.svg` });
const trackAt = (i) => toTrack(PLAYLIST[(i + PLAYLIST.length) % PLAYLIST.length]);

// Current song, derived from the clock to simulate a continuous broadcast
function currentPosition(now) {
  let offset = Math.floor(now / 1000) % CYCLE;
  let index = 0;
  while (offset >= PLAYLIST[index].duration) {
    offset -= PLAYLIST[index].duration;
    index++;
  }
  return { index, elapsed: offset };
}

export function getNowPlaying(now = Date.now()) {
  const { index, elapsed } = currentPosition(now);
  return {
    station: 'Radio Calico',
    song: { ...trackAt(index), elapsed },
    next: trackAt(index + 1),
    recent: [1, 2, 3].map((n) => trackAt(index - n)),
  };
}
