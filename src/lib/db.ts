import { PrismaClient } from '@prisma/client';
import { isDemoMode } from '@/demo/mode';
import { ValidationAppError } from '@/lib/errors';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function unavailablePrisma(): PrismaClient {
  const fail = () => {
    throw new ValidationAppError('This hosted demo is read-only until a database is connected.');
  };
  const nested = () =>
    new Proxy(function demoPrisma() {} as object, {
      get: () => fail,
      apply: fail,
    });
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return nested();
    },
  });
}

function createPrisma() {
  if (isDemoMode()) {
    return unavailablePrisma();
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production' && !isDemoMode()) {
  globalForPrisma.prisma = prisma;
}
