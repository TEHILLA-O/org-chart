import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';

export const GET = apiHandler('org:admin', async (ctx) => {
  const members = await prisma.organisationMembership.findMany({
    where: { organisationId: ctx.organisationId },
    include: { user: { select: { id: true, email: true, name: true, lastLoginAt: true } } },
  });
  return json({ members, role: ctx.role });
});
