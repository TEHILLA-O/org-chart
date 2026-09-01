import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  correlationId: string;
  actorId?: string;
  organisationId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getCorrelationId(): string {
  return requestContext.getStore()?.correlationId ?? crypto.randomUUID();
}

export function withCorrelation<T>(correlationId: string, fn: () => T): T {
  const parent = requestContext.getStore();
  return requestContext.run({ ...parent, correlationId }, fn);
}
