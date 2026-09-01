import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';

export const GET = apiHandler('charts:read', async (ctx) => {
  const [people, connectors, imports] = await Promise.all([
    prisma.person.count({ where: { organisationId: ctx.organisationId, deletedAt: null } }),
    prisma.connector.findMany({
      where: { organisationId: ctx.organisationId },
      select: { id: true, name: true, provider: true, status: true },
    }),
    prisma.importJob.count({ where: { organisationId: ctx.organisationId } }),
  ]);

  return json({
    sources: [
      {
        id: 'live',
        name: 'Live organisation',
        description: 'Positions and people as they sit in OrgPulse today.',
        href: '/charts',
        count: people,
      },
      {
        id: 'csv',
        name: 'CSV import',
        description: 'Map a spreadsheet, then open the live chart after apply.',
        href: '/import',
        count: imports,
      },
      ...connectors.map((connector) => ({
        id: connector.id,
        name: connector.name,
        description: `${connector.provider} · ${connector.status}. Preview on Directory, then open the chart.`,
        href: connector.provider === 'SUPABASE' ? '/directory' : '/integrations',
        count: null as number | null,
      })),
    ],
  });
});
