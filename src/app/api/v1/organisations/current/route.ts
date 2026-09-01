import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';

export const GET = apiHandler('org:read', async (ctx) => {
  const organisation = await prisma.organisation.findFirst({
    where: { id: ctx.organisationId, deletedAt: null },
  });
  return json({ organisation, role: ctx.role });
});
