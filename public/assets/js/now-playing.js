// "Now Playing" section: current song, up next, recently played
import { fetchNowPlaying } from './api.js';

const SYNC_INTERVAL_MS = 15000;

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function trackRow(t) {
  const row = document.createElement('div');
  row.className = 'track';
  const img = document.createElement('img');
  img.src = t.cover;
  img.alt = '';
  const text = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = t.title;
  const span = document.createElement('span');
  span.textContent = `${t.artist} · ${t.album}`;
  text.append(b, span);
  row.append(img, text);
  return row;
}

export function initNowPlaying(el, { onSync } = {}) {
  let current = null;
  let elapsed = 0;

  function renderProgress() {
    if (!current) return;
    el.elapsed.textContent = fmt(elapsed);
    el.bar.style.width = `${Math.min(100, (elapsed / current.duration) * 100)}%`;
  }

  function renderSong(song, data) {
    el.cover.src = song.cover;
    el.cover.alt = `Album cover for ${song.album}`;
    el.title.textContent = song.title;
    el.artist.textContent = song.artist;
    el.album.textContent = `${song.album} (${song.year})`;
    el.duration.textContent = fmt(song.duration);
    document.title = `${song.title} – ${song.artist} | Radio Calico`;
    el.next.replaceChildren(trackRow(data.next));
    el.recent.replaceChildren(...data.recent.map(trackRow));
  }

  async function refresh() {
    try {
      const data = await fetchNowPlaying();
      if (!current || current.id !== data.song.id) renderSong(data.song, data);
      current = data.song;
      elapsed = data.song.elapsed;
      renderProgress();
      onSync?.(current);
    } catch {
      el.title.textContent = 'Track info unavailable';
    }
  }

  // Tick locally every second; resync with the server periodically or when the song ends
  setInterval(() => {
    if (!current) return;
    elapsed++;
    if (elapsed >= current.duration) refresh();
    else renderProgress();
  }, 1000);
  setInterval(refresh, SYNC_INTERVAL_MS);
  refresh();
}
