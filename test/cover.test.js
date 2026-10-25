import './helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderCover } from '../src/services/cover.service.js';
import { PLAYLIST } from '../src/data/playlist.js';

describe('renderCover', () => {
  it('generates an SVG for every song in the playlist', () => {
    for (const song of PLAYLIST) {
      const svg = renderCover(song.id);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      assert.ok(svg.includes(song.colors[0]) && svg.includes(song.colors[1]));
    }
  });

  it('shows the album initials', () => {
    // "Purrfect Nights" → "PN"
    assert.match(renderCover(1), />PN<\/text>/);
  });

  it('returns null for an unknown song', () => {
    assert.equal(renderCover(999), null);
    assert.equal(renderCover(NaN), null);
  });
});
