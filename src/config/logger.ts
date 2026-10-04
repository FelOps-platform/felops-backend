import pino from 'pino';
import { pinoHttp } from 'pino-http';

import config from './env.js';

export const logger = pino({
  level: config.LOG_LEVEL,

  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: true,
        hideObject: true,
        messageFormat: '[{req.id}] {req.method} {req.url} {res.statusCode} {responseTime}ms',
      },
    },
  }),
});

export const httpLogger = pinoHttp({
  logger,

  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),

    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
