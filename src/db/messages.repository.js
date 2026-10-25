import { db } from './index.js';

const statements = {
  all: db.prepare('SELECT * FROM messages ORDER BY id DESC'),
  byId: db.prepare('SELECT * FROM messages WHERE id = ?'),
  insert: db.prepare('INSERT INTO messages (author, content) VALUES (?, ?)'),
};

export function listMessages() {
  return statements.all.all();
}

export function createMessage({ author, content }) {
  const { lastInsertRowid } = statements.insert.run(author, content);
  return statements.byId.get(lastInsertRowid);
}
