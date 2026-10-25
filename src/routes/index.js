import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { messagesRouter } from './messages.routes.js';
import { radioRouter } from './radio.routes.js';
import { ratingsRouter } from './ratings.routes.js';

// All API routes, mounted under /api
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/songs', ratingsRouter);
apiRouter.use('/', radioRouter);
