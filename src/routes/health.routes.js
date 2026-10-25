import { Router } from 'express';
import { sqliteVersion } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({ status: 'ok', sqlite: sqliteVersion() });
});
