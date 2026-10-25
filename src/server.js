import { config } from './config.js';
import { createApp } from './app.js';
import { closeDb } from './db/index.js';

const server = createApp().listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port} (${config.env})`);
});

// Graceful shutdown: finish in-flight requests, then close the database
function shutdown(signal) {
  console.log(`${signal} received, shutting down…`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
