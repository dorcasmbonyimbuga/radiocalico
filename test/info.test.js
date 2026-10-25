import './helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { getAppInfo } from '../src/services/info.service.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('getAppInfo', () => {
  it('returns the name and version from package.json', () => {
    const info = getAppInfo();
    assert.equal(info.name, pkg.name);
    assert.equal(info.version, pkg.version);
  });

  it('returns the current Node environment', () => {
    assert.equal(getAppInfo().environment, 'test');
  });

  it('always reports status "ok"', () => {
    assert.equal(getAppInfo().status, 'ok');
  });

  it('returns exactly the public fields, in a stable shape', () => {
    assert.deepEqual(Object.keys(getAppInfo()), ['name', 'version', 'environment', 'status']);
  });

  it('uses the injected package metadata and environment', () => {
    const info = getAppInfo({ packageJson: { name: 'demo', version: '9.8.7' }, environment: 'production' });
    assert.deepEqual(info, { name: 'demo', version: '9.8.7', environment: 'production', status: 'ok' });
  });

  it('does not leak other package.json fields', () => {
    const info = getAppInfo({
      packageJson: { name: 'demo', version: '1.0.0', dependencies: { express: '^5.0.0' }, scripts: { start: 'x' } },
    });
    assert.equal('dependencies' in info, false);
    assert.equal('scripts' in info, false);
  });

  it('returns a new object on every call', () => {
    const first = getAppInfo();
    first.status = 'mutated';
    assert.equal(getAppInfo().status, 'ok');
  });
});

describe('GET /api/info', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('responds 200 with the application info as JSON', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await res.json(), {
      name: pkg.name,
      version: pkg.version,
      environment: 'test',
      status: 'ok',
    });
  });

  it('is not cached', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('does not reveal the server technology', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('accepts a trailing slash', async () => {
    const res = await fetch(`${baseUrl}/api/info/`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  it('supports HEAD requests without a body', async () => {
    const res = await fetch(`${baseUrl}/api/info`, { method: 'HEAD' });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
  });

  for (const method of ['POST', 'PUT', 'DELETE']) {
    it(`rejects ${method} with a JSON 404`, async () => {
      const res = await fetch(`${baseUrl}/api/info`, { method });
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: 'Resource not found' });
    });
  }

  it('does not match unknown sub-paths', async () => {
    const res = await fetch(`${baseUrl}/api/info/details`);
    assert.equal(res.status, 404);
  });
});
