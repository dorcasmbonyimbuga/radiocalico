// Entry point: wires page elements to the modules
import { fetchStream } from './api.js';
import { initPlayer } from './player.js';
import { initNowPlaying } from './now-playing.js';
import { initRating } from './rating.js';

const $ = (id) => document.getElementById(id);

const rating = initRating({
  up: $('vote-up'),
  down: $('vote-down'),
  upCount: $('up-count'),
  downCount: $('down-count'),
  approval: $('approval'),
  feedback: $('rating-feedback'),
});

initNowPlaying({
  cover: $('cover'),
  title: $('title'),
  artist: $('artist'),
  album: $('album'),
  bar: $('bar'),
  elapsed: $('elapsed'),
  duration: $('duration'),
  next: $('next'),
  recent: $('recent'),
}, {
  onSync: (song) => rating.update(song.id),
});

const playerElements = {
  audio: $('audio'),
  button: $('play'),
  icon: $('icon'),
  badge: $('live'),
  status: $('status'),
  volume: $('volume'),
};

fetchStream()
  .then(({ url }) => initPlayer(playerElements, url))
  .catch(() => { playerElements.status.textContent = 'Stream not configured'; });
