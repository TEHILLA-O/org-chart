import { apiHandler, json } from '@/server/http/handler';
import { getScenarioDetail } from '@/server/services/scenario-service';

export const GET = apiHandler('scenarios:read', async (ctx, params) => {
  const detail = await getScenarioDetail(ctx.organisationId, params.id ?? '');
  return json(detail);
});
