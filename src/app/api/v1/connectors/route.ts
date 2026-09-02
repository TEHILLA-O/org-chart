import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { connectorMode } from '@/connectors/registry';
import { config } from '@/lib/config';
import { isDemoMode } from '@/demo/mode';
import { demoConnectors } from '@/demo/northstar';

export const GET = apiHandler('org:read', async (ctx) => {
  if (isDemoMode()) {
    return json({ connectors: demoConnectors() });
  }
  const connectors = await prisma.connector.findMany({
    where: { organisationId: ctx.organisationId },
    orderBy: { createdAt: 'asc' },
    include: { syncJobs: { orderBy: { createdAt: 'desc' }, take: 3 } },
  });

  const identityCounts = await prisma.externalIdentity.groupBy({
    by: ['provider'],
    where: { organisationId: ctx.organisationId },
    _count: { _all: true },
  });
  const countByProvider = new Map(identityCounts.map((row) => [row.provider, row._count._all]));
  const envRipplingToken = Boolean(config().RIPPLING_API_TOKEN);

  return json({
    connectors: connectors.map((connector) => {
      const stored = connector.config as Record<string, unknown>;
      const hasCredentials =
        Boolean(connector.encryptedCredentials && connector.encryptedCredentials.length > 0) ||
        (connector.provider === 'RIPPLING' && envRipplingToken);
      return {
        id: connector.id,
        provider: connector.provider,
        name: connector.name,
        status: connector.status,
        isReadOnly: connector.isReadOnly,
        lastSyncAt: connector.lastSyncAt,
        lastSuccessfulSyncAt: connector.lastSuccessfulSyncAt,
        hasCredentials,
        mode:
          connector.provider === 'RIPPLING' && hasCredentials
            ? 'real'
            : connectorMode(connector.provider, stored),
        identityCount: countByProvider.get(connector.provider) ?? 0,
        recentJobs: connector.syncJobs.map((job) => ({
          id: job.id,
          status: job.status,
          mode: job.mode,
          createdCount: job.createdCount,
          updatedCount: job.updatedCount,
          finishedAt: job.finishedAt,
        })),
      };
    }),
  });
});
