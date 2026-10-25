import { config } from '../config.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, 'Resource not found'));
}

// Central error handler: JSON responses, no internal details in production
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const message = status >= 500 && config.isProduction ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}
