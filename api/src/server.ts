import { createApp } from './app.js';
import { closeDatabase, initDatabase } from './config/db.js';
import { loadEnv } from './config/env.js';
import { initLogger } from './config/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  const config = await loadEnv();
  const logger = initLogger(config);

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  const { pool } = initDatabase(config.DATABASE_URL);
  await pool.query('SELECT 1');

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API server listening');
  });

  let isShuttingDown = false;
  const shutdown = (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logger.info({ signal }, 'Shutting down API server');

    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.closeIdleConnections();
    server.close(async (closeErr) => {
      if (closeErr) {
        logger.error({ err: closeErr }, 'Error closing HTTP server');
      }
      try {
        await closeDatabase();
      } catch (poolErr) {
        logger.error({ err: poolErr }, 'Error closing database pool');
      }
      process.exit(closeErr ? 1 : 0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err: unknown) => {
  console.log('Failed to start API server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
