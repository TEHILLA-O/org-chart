import { apiHandler, json } from '@/server/http/handler';
import { getPositionDetails } from '@/server/services/chart-service';

export const GET = apiHandler('positions:read', async (ctx, params) => {
  const scenarioId = new URL(ctx.request.url).searchParams.get('scenarioId');
  const details = await getPositionDetails(
    ctx.organisationId,
    params.id ?? '',
    ctx.actor,
    scenarioId,
  );
  return json(details);
});
