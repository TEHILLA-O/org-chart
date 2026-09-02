import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/demo/mode';
import { demoOrganisation } from '@/demo/northstar';
import { displayCompanyName } from '@/lib/utils';

export const GET = apiHandler('org:read', async (ctx) => {
  if (isDemoMode()) {
    return json({ organisation: demoOrganisation(), role: ctx.role });
  }
  const organisation = await prisma.organisation.findFirst({
    where: { id: ctx.organisationId, deletedAt: null },
  });
  return json({
    organisation: organisation
      ? { ...organisation, name: displayCompanyName(organisation.name) }
      : organisation,
    role: ctx.role,
  });
});


export const GET = apiHandler('org:read', async (ctx) => {
  if (isDemoMode()) {
    return json({ organisation: demoOrganisation(), role: ctx.role });
  }
  const organisation = await prisma.organisation.findFirst({
    where: { id: ctx.organisationId, deletedAt: null },
  });
  return json({ organisation, role: ctx.role });
});
