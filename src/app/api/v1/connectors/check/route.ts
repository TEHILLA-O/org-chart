import { apiHandler, json } from '@/server/http/handler';
import { checkAllSources } from '@/server/services/source-health-service';

export const GET = apiHandler('org:read', async (ctx) => {
  const health = await checkAllSources(ctx.organisationId);
  return json(health);
});

export const POST = apiHandler('integrations:manage', async (ctx) => {
  const health = await checkAllSources(ctx.organisationId, { refreshMockLeave: true });
  return json(health);
});
