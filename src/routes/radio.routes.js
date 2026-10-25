import { Router } from 'express';
import { config } from '../config.js';
import { getNowPlaying } from '../services/now-playing.service.js';

export const radioRouter = Router();

radioRouter.get('/stream', (req, res) => {
  res.json({ url: config.streamUrl });
});

radioRouter.get('/now-playing', (req, res) => {
  res.set('Cache-Control', 'no-store').json(getNowPlaying());
});
