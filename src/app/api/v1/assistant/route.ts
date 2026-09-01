import { prisma } from '@/lib/db';
import { apiHandler, json } from '@/server/http/handler';
import { lookupEmployeeBrief, readAssistantSettings } from '@/server/services/assistant-service';
import { isDemoMode } from '@/demo/mode';
import { demoOrganisation } from '@/demo/northstar';

export const GET = apiHandler('people:read', async (ctx) => {
  const organisation = isDemoMode()
    ? demoOrganisation()
    : await prisma.organisation.findFirst({
        where: { id: ctx.organisationId },
      });
  return json({
    settings: readAssistantSettings(organisation?.settings),
  });
});

export const POST = apiHandler('people:read', async (ctx) => {
  const body = (await ctx.request.json()) as { q?: string };
  const result = await lookupEmployeeBrief(ctx.organisationId, body.q ?? '');
  return json(result);
});
