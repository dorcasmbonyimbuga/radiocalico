import './helpers/setup.js';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { voteLimiter } from '../src/routes/ratings.routes.js';
import { timeAt } from './helpers/time.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

// Small HTTP client that keeps a listener's cookie across requests
function client() {
  let cookie = null;
  return {
    get cookie() { return cookie; },
    async request(path, { method = 'GET', body, rawBody } = {}) {
      const headers = {};
      if (cookie) headers.cookie = cookie;
      if (body !== undefined || rawBody !== undefined) headers['content-type'] = 'application/json';
      const res = await fetch(baseUrl + path, { method, headers, body: rawBody ?? (body && JSON.stringify(body)) });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const type = res.headers.get('content-type') || '';
      const data = type.includes('json') ? await res.json() : await res.text();
      return { status: res.status, headers: res.headers, data };
    },
  };
}

const api = client();

describe('General API', () => {
  it('GET /api/health', async () => {
    const { status, data } = await api.request('/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    assert.match(data.sqlite, /^\d+\.\d+\.\d+$/);
  });

  it('GET /api/stream returns the configured URL', async () => {
    const { data } = await api.request('/api/stream');
    assert.deepEqual(data, { url: 'https://example.test/live.m3u8' });
  });

  it('GET /api/now-playing returns the current song, uncached', async () => {
    const { status, headers, data } = await api.request('/api/now-playing');
    assert.equal(status, 200);
    assert.equal(headers.get('cache-control'), 'no-store');
    assert.equal(data.station, 'Radio Calico');
    assert.equal(typeof data.song.id, 'number');
    assert.equal(typeof data.song.elapsed, 'number');
    assert.equal(data.recent.length, 3);
  });

  it('GET /covers/:id.svg serves an image, 404 if unknown', async () => {
    const ok = await api.request('/covers/1.svg');
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('content-type'), /^image\/svg\+xml/);
    assert.equal((await api.request('/covers/999.svg')).status, 404);
  });

  it('serves the page and static assets', async () => {
    const page = await api.request('/');
    assert.equal(page.status, 200);
    assert.match(page.data, /<html lang="en">/);
    assert.match(page.data, /<title>Radio Calico<\/title>/);
    assert.equal((await api.request('/assets/js/main.js')).status, 200);
  });

  it('returns a JSON 404 for an unknown API route', async () => {
    const { status, data } = await api.request('/api/does-not-exist');
    assert.equal(status, 404);
    assert.deepEqual(data, { error: 'Resource not found' });
  });

  it('does not reveal the server technology on any kind of response', async () => {
    for (const path of ['/api/health', '/', '/assets/css/main.css', '/covers/1.svg', '/api/does-not-exist']) {
      const { headers } = await api.request(path);
      assert.equal(headers.get('x-powered-by'), null, path);
    }
  });
});

describe('Messages API', () => {
  it('creates then lists a message', async () => {
    const created = await api.request('/api/messages', { method: 'POST', body: { author: 'Ana', content: 'Hello' } });
    assert.equal(created.status, 201);
    assert.equal(created.data.author, 'Ana');
    const list = await api.request('/api/messages');
    assert.ok(list.data.some((m) => m.id === created.data.id));
  });

  it('rejects an incomplete message (400)', async () => {
    const { status, data } = await api.request('/api/messages', { method: 'POST', body: { author: 'Ana' } });
    assert.equal(status, 400);
    assert.deepEqual(data, { error: 'author and content are required' });
  });

  it('rejects malformed JSON (400)', async () => {
    const { status } = await api.request('/api/messages', { method: 'POST', rawBody: '{not json' });
    assert.equal(status, 400);
  });
});

describe('Ratings API', () => {
  const CURRENT = 2;
  const url = (id = CURRENT) => `/api/songs/${id}/rating`;

  beforeEach(() => {
    db.exec('DELETE FROM ratings');
    voteLimiter.reset();
    mock.timers.enable({ apis: ['Date'], now: timeAt(CURRENT, 15) });
  });
  afterEach(() => mock.timers.reset());

  it('assigns an anonymous httpOnly cookie on first visit, then reuses it', async () => {
    const alice = client();
    const first = await alice.request(url());
    const setCookie = first.headers.get('set-cookie');
    assert.match(setCookie, /^rc_voter=[0-9a-f-]{36};/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);

    const second = await alice.request(url());
    assert.equal(second.headers.get('set-cookie'), null);
  });

  it('replaces an invalid cookie', async () => {
    const res = await fetch(baseUrl + url(), { headers: { cookie: 'rc_voter=not-a-uuid' } });
    assert.match(res.headers.get('set-cookie'), /^rc_voter=[0-9a-f-]{36};/);
  });

  it("records votes from several listeners and each listener's own vote", async () => {
    const alice = client();
    const bob = client();
    await alice.request(url(), { method: 'PUT', body: { value: 1 } });
    await bob.request(url(), { method: 'PUT', body: { value: 1 } });
    const { status, data } = await bob.request(url(), { method: 'PUT', body: { value: -1 } });

    assert.equal(status, 200);
    assert.deepEqual(data, { songId: CURRENT, up: 1, down: 1, myVote: -1 });
    assert.equal((await alice.request(url())).data.myVote, 1);
    assert.equal((await client().request(url())).data.myVote, 0);
  });

  it('removes a vote with value 0', async () => {
    const alice = client();
    await alice.request(url(), { method: 'PUT', body: { value: 1 } });
    const { data } = await alice.request(url(), { method: 'PUT', body: { value: 0 } });
    assert.deepEqual(data, { songId: CURRENT, up: 0, down: 0, myVote: 0 });
  });

  it('rejects an invalid value (400)', async () => {
    for (const body of [{ value: 5 }, { value: '1' }, {}]) {
      const { status, data } = await client().request(url(), { method: 'PUT', body });
      assert.equal(status, 400, JSON.stringify(body));
      assert.deepEqual(data, { error: 'value must be 1, -1 or 0' });
    }
  });

  it('rejects a vote for a song that is not on air (409)', async () => {
    const { status, data } = await client().request(url(CURRENT + 1), { method: 'PUT', body: { value: 1 } });
    assert.equal(status, 409);
    assert.deepEqual(data, { error: 'This song is no longer playing' });
  });

  it('returns 404 for an unknown song or an invalid ID', async () => {
    const unknown = await client().request(url(999));
    assert.equal(unknown.status, 404);
    assert.deepEqual(unknown.data, { error: 'Song not found' });
    assert.equal((await client().request('/api/songs/abc/rating')).status, 404);
    assert.equal((await client().request(url(999), { method: 'PUT', body: { value: 1 } })).status, 404);
  });

  it('rate-limits votes per client IP (429 with Retry-After), even across cookies', async () => {
    // RATE_LIMIT_MAX=5 in the test setup; a fresh cookie per request must not bypass the limit
    for (let i = 1; i <= 5; i++) {
      const { status, headers } = await client().request(url(), { method: 'PUT', body: { value: 1 } });
      assert.equal(status, 200);
      assert.equal(headers.get('ratelimit-remaining'), String(5 - i));
    }
    const blocked = await client().request(url(), { method: 'PUT', body: { value: 1 } });
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.data, { error: 'Too many votes, please slow down' });
    assert.equal(blocked.headers.get('retry-after'), '60');
    assert.equal(blocked.headers.get('x-powered-by'), null);
  });

  it('does not rate-limit reading the rating', async () => {
    const alice = client();
    for (let i = 0; i < 6; i++) await alice.request(url(), { method: 'PUT', body: { value: 1 } });
    const { status, headers } = await alice.request(url());
    assert.equal(status, 200);
    assert.equal(headers.get('ratelimit-limit'), null);
  });

  it('accepts votes again once the window has passed', async () => {
    for (let i = 0; i < 6; i++) await client().request(url(), { method: 'PUT', body: { value: 1 } });
    mock.timers.tick(60_000);
    // Song 2 lasts 187 s: 15 s + 60 s is still within it
    const { status } = await client().request(url(), { method: 'PUT', body: { value: 1 } });
    assert.equal(status, 200);
  });

  it('results are not cached', async () => {
    const { headers } = await client().request(url());
    assert.equal(headers.get('cache-control'), 'no-store');
  });
});
