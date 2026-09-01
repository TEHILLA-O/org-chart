import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/demo/mode';
import { demoMembers } from '@/demo/northstar';

export const GET = apiHandler('org:admin', async (ctx) => {
  if (isDemoMode()) {
    return json({ members: demoMembers(), role: ctx.role });
  }
  const members = await prisma.organisationMembership.findMany({
    where: { organisationId: ctx.organisationId },
    include: { user: { select: { id: true, email: true, name: true, lastLoginAt: true } } },
  });
  return json({ members, role: ctx.role });
});
