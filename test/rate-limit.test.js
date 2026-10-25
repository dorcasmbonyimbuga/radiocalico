import './helpers/setup.js';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/middleware/rate-limit.js';
import { HttpError } from '../src/middleware/errors.js';

// Runs the middleware against a fake request and returns the error passed to next() and the headers set
function hit(limiter, ip = '203.0.113.1') {
  const headers = {};
  const res = { set: (name, value) => Object.assign(headers, typeof name === 'object' ? name : { [name]: value }) };
  let error = null;
  limiter({ ip }, res, (err) => { error = err ?? null; });
  return { error, headers };
}

describe('rateLimit', () => {
  beforeEach(() => mock.timers.enable({ apis: ['Date'], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  it('allows requests up to the limit and reports remaining quota', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    assert.deepEqual(
      [1, 2, 3].map(() => hit(limiter).headers['RateLimit-Remaining']),
      ['2', '1', '0'],
    );
    const { error, headers } = hit(limiter, '203.0.113.1');
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, 429);
    assert.equal(headers['RateLimit-Limit'], '3');
    assert.equal(headers['Retry-After'], '60');
  });

  it('uses the custom message', () => {
    const limiter = rateLimit({ windowMs: 1_000, max: 1, message: 'Slow down' });
    hit(limiter);
    assert.equal(hit(limiter).error.message, 'Slow down');
  });

  it('tracks each client separately', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    assert.equal(hit(limiter, '203.0.113.1').error, null);
    assert.equal(hit(limiter, '203.0.113.2').error, null);
    assert.equal(hit(limiter, '203.0.113.1').error.status, 429);
  });

  it('starts a fresh window once the previous one expires', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    hit(limiter);
    mock.timers.tick(30_000);
    const blocked = hit(limiter);
    assert.equal(blocked.error.status, 429);
    assert.equal(blocked.headers['Retry-After'], '30');
    mock.timers.tick(30_000);
    assert.equal(hit(limiter).error, null);
  });

  it('reset() clears all counters', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    hit(limiter);
    limiter.reset();
    assert.equal(hit(limiter).error, null);
  });

  it('supports a custom key generator', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1, keyGenerator: () => 'everyone' });
    hit(limiter, '203.0.113.1');
    assert.equal(hit(limiter, '203.0.113.2').error.status, 429);
  });
});
