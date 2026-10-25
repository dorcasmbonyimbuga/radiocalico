import { Router } from 'express';
import { config } from '../config.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { voter } from '../middleware/voter.js';
import { getRating, rateSong } from '../services/rating.service.js';

export const ratingsRouter = Router();

// Limits vote submissions per client IP (the voter cookie is trivial to reset, the IP is not)
export const voteLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many votes, please slow down',
});

ratingsRouter.use(voter);

ratingsRouter.get('/:songId/rating', (req, res) => {
  res.set('Cache-Control', 'no-store').json(getRating(Number(req.params.songId), req.voterId));
});

ratingsRouter.put('/:songId/rating', voteLimiter, (req, res) => {
  const value = req.body?.value;
  res.json(rateSong(Number(req.params.songId), req.voterId, value));
});
