import express from 'express';
import { config } from './config.js';
import { apiRouter } from './routes/index.js';
import { coversRouter } from './routes/covers.routes.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();
  // Do not advertise the framework in response headers
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(config.publicDir, { maxAge: config.isProduction ? '1h' : 0 }));

  app.use('/api', apiRouter);
  app.use('/covers', coversRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
