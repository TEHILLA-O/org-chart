import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';

export const GET = apiHandler('org:read', async (ctx) => {
  const locations = await prisma.location.findMany({
    where: { organisationId: ctx.organisationId, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  return json({ locations });
});
