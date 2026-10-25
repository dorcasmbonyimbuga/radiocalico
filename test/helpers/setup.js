// Import FIRST in every test file:
// ESM modules are evaluated in import order, so the config reads these values.
process.env.NODE_ENV = 'test';
process.env.DB_FILE = ':memory:';
process.env.STREAM_URL = 'https://example.test/live.m3u8';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '5';
