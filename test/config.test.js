import './helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ConfigError, loadConfig } from '../src/config.js';

// Asserts that loading `env` fails and that one reported problem matches `pattern`
function assertInvalid(env, pattern) {
  assert.throws(() => loadConfig(env), (err) => {
    assert.ok(err instanceof ConfigError);
    assert.ok(err.problems.some((p) => pattern.test(p)), `no problem matching ${pattern}: ${err.problems}`);
    return true;
  });
}

describe('loadConfig', () => {
  it('applies safe defaults when nothing is set', () => {
    const config = loadConfig({});
    assert.equal(config.env, 'development');
    assert.equal(config.isProduction, false);
    assert.equal(config.port, 3000);
    assert.equal(path.basename(config.dbFile), 'radiocalico.db');
    assert.ok(path.isAbsolute(config.dbFile));
    assert.equal(config.cookieSecure, false);
    assert.equal(config.trustProxy, false);
    assert.match(config.streamUrl, /^https:\/\//);
    assert.deepEqual({ ...config.rateLimit }, { windowMs: 60_000, max: 20 });
  });

  it('treats blank variables as unset', () => {
    assert.equal(loadConfig({ PORT: '  ', NODE_ENV: '' }).port, 3000);
  });

  it('reads valid values', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      DB_FILE: ':memory:',
      COOKIE_SECURE: 'false',
      TRUST_PROXY: '1',
      STREAM_URL: 'https://radio.example/live.m3u8',
      RATE_LIMIT_WINDOW_MS: '30000',
      RATE_LIMIT_MAX: '3',
    });
    assert.equal(config.isProduction, true);
    assert.equal(config.port, 8080);
    assert.equal(config.dbFile, ':memory:');
    assert.equal(config.cookieSecure, false);
    assert.equal(config.trustProxy, 1);
    assert.equal(config.streamUrl, 'https://radio.example/live.m3u8');
    assert.deepEqual({ ...config.rateLimit }, { windowMs: 30_000, max: 3 });
  });

  it('enables secure cookies by default in production', () => {
    assert.equal(loadConfig({ NODE_ENV: 'production' }).cookieSecure, true);
  });

  it('returns a frozen object', () => {
    const config = loadConfig({});
    assert.ok(Object.isFrozen(config));
    assert.ok(Object.isFrozen(config.rateLimit));
  });

  it('rejects an unknown NODE_ENV', () => {
    assertInvalid({ NODE_ENV: 'prod' }, /NODE_ENV must be one of development, production, test/);
  });

  for (const port of ['abc', '3000.5', '-1', '0', '70000']) {
    it(`rejects PORT=${port}`, () => assertInvalid({ PORT: port }, /^PORT must be/));
  }

  it('rejects a non-boolean COOKIE_SECURE', () => {
    assertInvalid({ COOKIE_SECURE: 'yes' }, /COOKIE_SECURE must be "true" or "false"/);
  });

  it('rejects an invalid or non-HTTP STREAM_URL', () => {
    assertInvalid({ STREAM_URL: 'not a url' }, /STREAM_URL must be a valid URL/);
    assertInvalid({ STREAM_URL: 'ftp://radio.example/live.m3u8' }, /STREAM_URL must use http or https/);
  });

  it('rejects out-of-range rate limit settings', () => {
    assertInvalid({ RATE_LIMIT_MAX: '0' }, /RATE_LIMIT_MAX must be between 1 and 10000/);
    assertInvalid({ RATE_LIMIT_WINDOW_MS: '10' }, /RATE_LIMIT_WINDOW_MS must be between/);
  });

  it('accepts the supported TRUST_PROXY forms', () => {
    assert.equal(loadConfig({ TRUST_PROXY: 'true' }).trustProxy, true);
    assert.equal(loadConfig({ TRUST_PROXY: 'false' }).trustProxy, false);
    assert.equal(loadConfig({ TRUST_PROXY: '2' }).trustProxy, 2);
    const list = 'loopback, 10.0.0.0/8, 172.16.0.1, ::1';
    assert.equal(loadConfig({ TRUST_PROXY: list }).trustProxy, list);
  });

  it('rejects an invalid TRUST_PROXY entry', () => {
    assertInvalid({ TRUST_PROXY: 'loopback, my-proxy' }, /TRUST_PROXY .*invalid: my-proxy/);
    assertInvalid({ TRUST_PROXY: '10.0.0.0/8/1' }, /invalid: 10\.0\.0\.0\/8\/1/);
  });

  it('reports every problem at once', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'x', PORT: 'y', COOKIE_SECURE: 'z' }), (err) => {
      assert.equal(err.problems.length, 3);
      assert.match(err.message, /^Invalid environment configuration:\n {2}- /);
      return true;
    });
  });
});
