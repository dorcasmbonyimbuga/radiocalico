import { Router } from 'express';
import { renderCover } from '../services/cover.service.js';

export const coversRouter = Router();

coversRouter.get('/:id.svg', (req, res) => {
  const svg = renderCover(Number(req.params.id));
  if (!svg) return res.sendStatus(404);
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
});
