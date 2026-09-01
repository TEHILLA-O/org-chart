import pino from 'pino';
import { config } from './config';

const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'secret',
  'authorization',
  'encryptedCredentials',
  'cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.idToken',
  '*.secret',
  '*.authorization',
  '*.encryptedCredentials',
  '*.cookie',
];

export function createLogger(correlationId?: string) {
  const cfg = (() => {
    try {
      return config();
    } catch {
      return { LOG_LEVEL: 'info' as const, NODE_ENV: process.env.NODE_ENV ?? 'development' };
    }
  })();

  return pino({
    level: cfg.LOG_LEVEL ?? 'info',
    redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
    base: correlationId ? { correlationId } : {},
    transport:
      cfg.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
  });
}

export const logger = createLogger();
