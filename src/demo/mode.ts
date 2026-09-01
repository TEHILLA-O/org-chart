import { ValidationAppError } from '@/lib/errors';

export function isDemoMode() {
  if (process.env.ORG_DEMO === 'true') return true;
  return !process.env.DATABASE_URL?.trim();
}

export function assertWritable() {
  if (isDemoMode()) {
    throw new ValidationAppError('This hosted demo is read-only until a database is connected.');
  }
}
