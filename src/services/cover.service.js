import { PLAYLIST } from '../data/playlist.js';

const XML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);

// Generated SVG album cover (gradient + initials); null if the song does not exist
export function renderCover(id) {
  const song = PLAYLIST.find((s) => s.id === id);
  if (!song) return null;
  const initials = escapeXml(song.album.split(' ').map((w) => w[0]).join('').slice(0, 2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${song.colors[0]}"/><stop offset="1" stop-color="${song.colors[1]}"/>
  </linearGradient></defs>
  <rect width="300" height="300" fill="url(#g)"/>
  <circle cx="150" cy="150" r="95" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
  <text x="150" y="172" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#fff">${initials}</text>
</svg>`;
}
