import type { ConnectorAdapter } from './types';
import { createMockMicrosoftConnector } from './microsoft-mock';
import { createMicrosoftGraphConnector } from './microsoft-graph';
import { createMockRipplingConnector } from './rippling-mock';
import { createRipplingConnector } from './rippling';
import { config } from '@/lib/config';

export function resolveConnector(provider: string, mode: 'mock' | 'real' = 'mock'): ConnectorAdapter {
  const cfg = config();

  if (provider === 'MICROSOFT_GRAPH' && mode === 'real') {
    return createMicrosoftGraphConnector({
      clientId: cfg.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: cfg.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      tenantId: cfg.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
    });
  }
  if (provider === 'MICROSOFT_GRAPH' || provider === 'MICROSOFT_MOCK') {
    return createMockMicrosoftConnector();
  }

  if (provider === 'RIPPLING' && mode === 'real') {
    return createRipplingConnector({
      apiToken: cfg.RIPPLING_API_TOKEN,
      baseUrl: cfg.RIPPLING_API_BASE_URL,
    });
  }
  if (provider === 'RIPPLING') {
    return createMockRipplingConnector();
  }

  throw new Error(`No connector registered for provider ${provider}`);
}

export function connectorMode(
  provider: string,
  stored?: Record<string, unknown> | null,
): 'mock' | 'real' {
  const fromRow = stored?.mode;
  if (fromRow === 'mock' || fromRow === 'real') return fromRow;
  if (provider === 'RIPPLING') return config().RIPPLING_CONNECTOR_MODE;
  if (provider === 'MICROSOFT_GRAPH' || provider === 'MICROSOFT_MOCK') {
    return config().MICROSOFT_CONNECTOR_MODE;
  }
  return 'mock';
}
