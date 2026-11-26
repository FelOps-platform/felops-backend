import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express, Router } from 'express';
import helmet from 'helmet';
import { getConfig } from './config/env.js';
import { createHttpLogger, getLogger } from './config/logger.js';
import { createErrorHandler, notFoundMiddleware } from './middleware/error-handler.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { clientRouter } from './routes.js';

const JSON_BODY_LIMIT = '100kb';

export function createApp(router: Router = clientRouter): Express {
  const config = getConfig();
  const logger = getLogger();
  const app = express();

  app.set('trust proxy', config.TRUST_PROXY);
  app.use(requestIdMiddleware);
  app.use(createHttpLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1', router);

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(logger));

  return app;
}
