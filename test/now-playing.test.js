import './helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNowPlaying } from '../src/services/now-playing.service.js';
import { PLAYLIST } from '../src/data/playlist.js';
import { CYCLE, timeAt } from './helpers/time.js';

describe('getNowPlaying', () => {
  it('starts with the first song at the beginning of the cycle', () => {
    const { song } = getNowPlaying(0);
    assert.equal(song.id, PLAYLIST[0].id);
    assert.equal(song.elapsed, 0);
  });

  it('computes the elapsed time within the song', () => {
    const { song } = getNowPlaying(timeAt(3, 42));
    assert.equal(song.id, 3);
    assert.equal(song.elapsed, 42);
  });

  it('switches to the next song exactly when the previous one ends', () => {
    const first = PLAYLIST[0];
    assert.equal(getNowPlaying((first.duration - 1) * 1000).song.id, first.id);
    assert.equal(getNowPlaying(first.duration * 1000).song.id, PLAYLIST[1].id);
    assert.equal(getNowPlaying(first.duration * 1000).song.elapsed, 0);
  });

  it('ignores milliseconds', () => {
    assert.deepEqual(getNowPlaying(timeAt(2, 10) + 999).song, getNowPlaying(timeAt(2, 10)).song);
  });

  it('loops over the playlist after a full cycle', () => {
    assert.deepEqual(getNowPlaying(timeAt(4, 5, 7)), getNowPlaying(timeAt(4, 5)));
    assert.equal(getNowPlaying(CYCLE * 1000).song.id, PLAYLIST[0].id);
  });

  it('returns the next song and the 3 previous ones, wrapping around the ends', () => {
    const first = getNowPlaying(timeAt(1));
    assert.equal(first.next.id, 2);
    assert.deepEqual(first.recent.map((t) => t.id), [5, 4, 3]);

    const last = getNowPlaying(timeAt(5));
    assert.equal(last.next.id, 1);
    assert.deepEqual(last.recent.map((t) => t.id), [4, 3, 2]);
  });

  it('exposes the cover and hides internal data', () => {
    const { song, next } = getNowPlaying(timeAt(2));
    assert.equal(song.cover, '/covers/2.svg');
    assert.equal(next.cover, '/covers/3.svg');
    assert.equal('colors' in song, false);
    for (const key of ['title', 'artist', 'album', 'year', 'duration']) assert.ok(key in song, key);
  });

  it('elapsed time always stays below the song duration', () => {
    for (let t = 0; t < CYCLE; t += 7) {
      const { song } = getNowPlaying(t * 1000);
      assert.ok(song.elapsed >= 0 && song.elapsed < song.duration, `t=${t}`);
    }
  });
});
