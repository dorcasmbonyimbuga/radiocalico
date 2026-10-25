import { Router } from 'express';
import { getAppInfo } from '../services/info.service.js';

export const infoRouter = Router();

infoRouter.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store').json(getAppInfo());
});
