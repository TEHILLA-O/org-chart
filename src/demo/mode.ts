import { ValidationAppError } from '@/lib/errors';

function databaseUrlLooksLocal(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return true;
  }
}

export function isDemoMode() {
  if (process.env.ORG_DEMO === 'true') return true;
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.includes('[YOUR-PASSWORD]')) return true;
  // Vercel cannot reach Docker Postgres on the developer's machine.
  if (process.env.VERCEL && databaseUrlLooksLocal(url)) return true;
  return false;
}

export function assertWritable() {
  if (isDemoMode()) {
    throw new ValidationAppError('This hosted demo is read-only until a database is connected.');
  }
}
