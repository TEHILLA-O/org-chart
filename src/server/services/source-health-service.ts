import { prisma } from '@/lib/db';
import { connectorMode, resolveConnector } from '@/connectors/registry';
import { applyMockRipplingLeave } from '@/connectors/rippling-mock/live-fields';
import { decryptConnectorSecrets } from '@/lib/connector-secrets';
import { config } from '@/lib/config';
import { isDemoMode } from '@/demo/mode';
import { demoConnectors } from '@/demo/northstar';

export interface SourceHealth {
  connectorId: string;
  provider: string;
  name: string;
  status: string;
  mode: 'mock' | 'real';
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  identityCount: number;
  test: { ok: boolean; message: string };
}

export async function checkAllSources(organisationId: string, options?: { refreshMockLeave?: boolean }) {
  if (isDemoMode()) {
    const now = new Date().toISOString();
    return {
      checkedAt: now,
      liveCount: demoConnectors().length,
      total: demoConnectors().length,
      sources: demoConnectors().map((connector) => ({
        connectorId: connector.id,
        provider: connector.provider,
        name: connector.name,
        status: connector.status,
        mode: connector.mode,
        lastSyncAt: connector.lastSyncAt,
        lastSuccessfulSyncAt: connector.lastSuccessfulSyncAt,
        identityCount: connector.identityCount,
        test: { ok: true, message: 'Demo source is live in memory.' },
      })),
    };
  }
  const connectors = await prisma.connector.findMany({
    where: { organisationId },
    orderBy: { createdAt: 'asc' },
  });

  const results: SourceHealth[] = [];

  for (const connector of connectors) {
    const stored = (connector.config ?? {}) as Record<string, unknown>;
    const secrets = decryptConnectorSecrets(connector.encryptedCredentials);
    const ripplingToken = config().RIPPLING_API_TOKEN;
    if (connector.provider === 'RIPPLING' && !secrets.apiToken && ripplingToken) {
      secrets.apiToken = ripplingToken;
    }
    const mode =
      connector.provider === 'RIPPLING' && (secrets.apiToken || stored.mode === 'real')
        ? 'real'
        : connectorMode(connector.provider, stored);
    let test = { ok: false, message: 'Connector did not respond.' };

    try {
      const adapter = resolveConnector(connector.provider, mode, secrets);
      test = await adapter.testConnection({
        organisationId,
        settings: stored,
        credentials: secrets,
      });
    } catch (error) {
      test = {
        ok: false,
        message: error instanceof Error ? error.message : 'Connector failed to initialise.',
      };
    }

    const identityCount = await prisma.externalIdentity.count({
      where: { organisationId, provider: connector.provider },
    });

    if (options?.refreshMockLeave && connector.provider === 'RIPPLING' && mode === 'mock' && test.ok) {
      await applyMockRipplingLeave(organisationId);
      await prisma.connector.update({
        where: { id: connector.id },
        data: { lastSyncAt: new Date(), lastSuccessfulSyncAt: new Date(), status: 'CONNECTED' },
      });
    } else {
      await prisma.connector.update({
        where: { id: connector.id },
        data: { status: test.ok ? 'CONNECTED' : 'ERROR' },
      });
    }

    results.push({
      connectorId: connector.id,
      provider: connector.provider,
      name: connector.name,
      status: test.ok ? 'CONNECTED' : 'ERROR',
      mode,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      lastSuccessfulSyncAt: connector.lastSuccessfulSyncAt?.toISOString() ?? null,
      identityCount,
      test,
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    sources: results,
    liveCount: results.filter((item) => item.test.ok).length,
    total: results.length,
  };
}
