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

export function createLogger(config: Pick<EnvConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
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
}

export function initLogger(config: Pick<EnvConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  currentLogger = createLogger(config);
  return currentLogger;
}

export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

export function getLogger(): Logger {
  return currentLogger;
}

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req) => req.id,
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
