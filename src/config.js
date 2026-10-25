import path from 'node:path';
import { isIP } from 'node:net';

// Project root, independent of the directory Node is launched from
const ROOT = path.resolve(import.meta.dirname, '..');

const NODE_ENVS = ['development', 'production', 'test'];
const PROXY_KEYWORDS = ['loopback', 'linklocal', 'uniquelocal'];
const DEFAULT_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

// Parses and validates the environment. Collects every problem, then throws a single ConfigError.
export function loadConfig(env = process.env) {
  const problems = [];

  // Unset and blank variables both fall back to the default
  const read = (name) => {
    const value = env[name]?.trim();
    return value ? value : undefined;
  };

  function oneOf(name, allowed, fallback) {
    const raw = read(name);
    if (raw === undefined) return fallback;
    if (!allowed.includes(raw)) problems.push(`${name} must be one of ${allowed.join(', ')} (got "${raw}")`);
    return raw;
  }

  function integer(name, fallback, { min, max }) {
    const raw = read(name);
    if (raw === undefined) return fallback;
    if (!/^\d+$/.test(raw)) {
      problems.push(`${name} must be an integer (got "${raw}")`);
      return fallback;
    }
    const value = Number(raw);
    if (value < min || value > max) problems.push(`${name} must be between ${min} and ${max} (got ${value})`);
    return value;
  }

  function boolean(name, fallback) {
    const raw = read(name);
    if (raw === undefined) return fallback;
    if (raw !== 'true' && raw !== 'false') {
      problems.push(`${name} must be "true" or "false" (got "${raw}")`);
      return fallback;
    }
    return raw === 'true';
  }

  function httpUrl(name, fallback) {
    const raw = read(name) ?? fallback;
    try {
      const { protocol } = new URL(raw);
      if (protocol !== 'http:' && protocol !== 'https:') problems.push(`${name} must use http or https (got "${raw}")`);
    } catch {
      problems.push(`${name} must be a valid URL (got "${raw}")`);
    }
    return raw;
  }

  // Express "trust proxy": true/false, a hop count, or a comma-separated list of IPs, subnets or keywords
  function trustProxy(name) {
    const raw = read(name);
    if (raw === undefined || raw === 'false') return false;
    if (raw === 'true') return true;
    if (/^\d+$/.test(raw)) return Number(raw);
    const invalid = raw.split(',').map((s) => s.trim()).filter((entry) => {
      if (PROXY_KEYWORDS.includes(entry)) return false;
      const [ip, prefix, ...rest] = entry.split('/');
      return !isIP(ip) || rest.length > 0 || (prefix !== undefined && !/^\d{1,3}$/.test(prefix));
    });
    if (invalid.length) {
      problems.push(`${name} must be true, false, a hop count, or a list of IPs/subnets/${PROXY_KEYWORDS.join('/')} (invalid: ${invalid.join(', ')})`);
    }
    return raw;
  }

  const nodeEnv = oneOf('NODE_ENV', NODE_ENVS, 'development');
  const isProduction = nodeEnv === 'production';
  const dbFile = read('DB_FILE') ?? 'data/radiocalico.db';

  const config = {
    env: nodeEnv,
    isProduction,
    port: integer('PORT', 3000, { min: 1, max: 65535 }),
    // ':memory:' = temporary in-memory database (used by the tests)
    dbFile: dbFile === ':memory:' ? dbFile : path.resolve(ROOT, dbFile),
    publicDir: path.join(ROOT, 'public'),
    // Secure cookies require HTTPS; defaults to on in production (set COOKIE_SECURE=false for plain HTTP)
    cookieSecure: boolean('COOKIE_SECURE', isProduction),
    // Needed behind a reverse proxy so req.ip (used for rate limiting) is the real client IP
    trustProxy: trustProxy('TRUST_PROXY'),
    // HLS stream URL; public test stream by default, replace with the real stream
    streamUrl: httpUrl('STREAM_URL', DEFAULT_STREAM_URL),
    // Vote rate limit: at most `max` votes per client IP per window
    rateLimit: Object.freeze({
      windowMs: integer('RATE_LIMIT_WINDOW_MS', 60_000, { min: 1_000, max: 86_400_000 }),
      max: integer('RATE_LIMIT_MAX', 20, { min: 1, max: 10_000 }),
    }),
  };

  if (problems.length) throw new ConfigError(problems);
  return Object.freeze(config);
}

// Fail fast on startup with a readable message instead of a stack trace
function loadOrExit() {
  try {
    return loadConfig(process.env);
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}

export const config = loadOrExit();
