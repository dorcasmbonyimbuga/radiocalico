import './helpers/setup.js';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/index.js';
import { getRating, rateSong } from '../src/services/rating.service.js';
import { HttpError } from '../src/middleware/errors.js';
import { timeAt } from './helpers/time.js';

const CURRENT = 3;
const OTHER = 4;

const httpError = (status) => (err) => err instanceof HttpError && err.status === status;

describe('rating service', () => {
  beforeEach(() => {
    db.exec('DELETE FROM ratings');
    // Freeze the clock: song 3 is on air
    mock.timers.enable({ apis: ['Date'], now: timeAt(CURRENT, 30) });
  });
  afterEach(() => mock.timers.reset());

  it('returns an empty summary for a song with no votes', () => {
    assert.deepEqual(getRating(CURRENT, 'alice'), { songId: CURRENT, up: 0, down: 0, myVote: 0 });
  });

  it('records an upvote and a downvote', () => {
    rateSong(CURRENT, 'alice', 1);
    const summary = rateSong(CURRENT, 'bob', -1);
    assert.deepEqual(summary, { songId: CURRENT, up: 1, down: 1, myVote: -1 });
    assert.equal(getRating(CURRENT, 'alice').myVote, 1);
  });

  it('allows only one vote per listener: a new vote replaces the old one', () => {
    rateSong(CURRENT, 'alice', 1);
    const summary = rateSong(CURRENT, 'alice', -1);
    assert.deepEqual(summary, { songId: CURRENT, up: 0, down: 1, myVote: -1 });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ratings').get().n, 1);
  });

  it('removes the vote with value 0', () => {
    rateSong(CURRENT, 'alice', 1);
    assert.deepEqual(rateSong(CURRENT, 'alice', 0), { songId: CURRENT, up: 0, down: 0, myVote: 0 });
  });

  it('removing a vote that does not exist does not throw', () => {
    assert.deepEqual(rateSong(CURRENT, 'alice', 0), { songId: CURRENT, up: 0, down: 0, myVote: 0 });
  });

  for (const value of [2, -2, '1', 0.5, null, undefined, true]) {
    it(`rejects the value ${JSON.stringify(value)} (400)`, () => {
      assert.throws(() => rateSong(CURRENT, 'alice', value), httpError(400));
    });
  }

  it('rejects a vote for a song that is not on air (409)', () => {
    assert.throws(() => rateSong(OTHER, 'alice', 1), httpError(409));
  });

  it('accepts a vote on the new song once the broadcast moves on', () => {
    mock.timers.setTime(timeAt(OTHER, 0));
    assert.equal(rateSong(OTHER, 'alice', 1).up, 1);
    assert.throws(() => rateSong(CURRENT, 'alice', 1), httpError(409));
  });

  it('rejects an unknown song (404), for both reading and voting', () => {
    assert.throws(() => getRating(999, 'alice'), httpError(404));
    assert.throws(() => rateSong(999, 'alice', 1), httpError(404));
    assert.throws(() => rateSong(Number('abc'), 'alice', 1), httpError(404));
  });

  it('keeps votes separate for each song', () => {
    rateSong(CURRENT, 'alice', 1);
    assert.deepEqual(getRating(OTHER, 'alice'), { songId: OTHER, up: 0, down: 0, myVote: 0 });
  });

  it('the database rejects a value outside -1/1, even when bypassing the service', () => {
    assert.throws(() => db.prepare("INSERT INTO ratings (song_id, voter_id, value) VALUES (1, 'x', 3)").run());
  });
});
