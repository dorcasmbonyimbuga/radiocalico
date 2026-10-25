import { Router } from 'express';
import { createMessage, listMessages } from '../db/messages.repository.js';
import { HttpError } from '../middleware/errors.js';

export const messagesRouter = Router();

messagesRouter.get('/', (req, res) => {
  res.json(listMessages());
});

messagesRouter.post('/', (req, res) => {
  const { author, content } = req.body ?? {};
  if (!author || !content) {
    throw new HttpError(400, 'author and content are required');
  }
  res.status(201).json(createMessage({ author, content }));
});
