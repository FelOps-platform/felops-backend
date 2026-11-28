import pino from 'pino';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { EnvConfig } from './env.js';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.resetToken',
  'req.body.code',
];

let currentLogger: Logger = pino({ enabled: false });

export function initLogger(config: Pick<EnvConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  currentLogger = pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    ...(config.NODE_ENV === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
    }),
  });
  return currentLogger;
}

export function getLogger(): Logger {
  return currentLogger;
}

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req) => req.id,
    // Keep error-handler.ts as the single log for failed requests; it carries the domain code.
    customLogLevel: (_req, res) => (res.statusCode >= 400 ? 'silent' : 'info'),
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: typeof req.url === 'string' ? req.url.split('?')[0] : req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  });
}
