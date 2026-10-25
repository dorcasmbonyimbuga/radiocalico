import './helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Each test file runs in its own process, so closing the shared connection here does not affect other files.
// The tests below run in order and share that connection.
const { db, closeDb, sqliteVersion } = await import('../src/db/index.js');

describe('closeDb', () => {
  it('starts with an open, usable connection', () => {
    assert.match(sqliteVersion(), /^\d+\.\d+\.\d+$/);
  });

  it('closes the connection', () => {
    closeDb();
    assert.throws(() => db.prepare('SELECT 1'), { code: 'ERR_INVALID_STATE' });
  });

  it('is idempotent: calling it again does not throw', () => {
    assert.doesNotThrow(() => closeDb());
    assert.doesNotThrow(() => closeDb());
  });

  it('relies on Node behavior that is stable across 22.x and 24.x', () => {
    // Closing twice throws ERR_INVALID_STATE, the code closeDb tolerates
    const other = new DatabaseSync(':memory:');
    other.close();
    assert.throws(() => other.close(), { code: 'ERR_INVALID_STATE' });
  });
});
