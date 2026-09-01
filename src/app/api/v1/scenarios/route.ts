import { apiHandler, json } from '@/server/http/handler';
import { listScenarios } from '@/server/services/scenario-service';

export const GET = apiHandler('scenarios:read', async (ctx) => {
  const scenarios = await listScenarios(ctx.organisationId);
  return json({ scenarios });
});
