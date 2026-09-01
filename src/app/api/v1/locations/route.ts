import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/demo/mode';
import { demoLocations } from '@/demo/northstar';

export const GET = apiHandler('org:read', async (ctx) => {
  if (isDemoMode()) {
    return json({ locations: demoLocations });
  }
  const locations = await prisma.location.findMany({
    where: { organisationId: ctx.organisationId, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  return json({ locations });
});
