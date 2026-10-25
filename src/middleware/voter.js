import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

const COOKIE = 'rc_voter';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f-]{36}$/i;

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Anonymous listener ID, kept in a cookie and exposed as req.voterId
export function voter(req, res, next) {
  let id = readCookie(req, COOKIE);
  if (!id || !UUID_RE.test(id)) {
    id = randomUUID();
    res.cookie(COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: ONE_YEAR_MS,
    });
  }
  req.voterId = id;
  next();
}
