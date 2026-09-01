import { apiHandler, json } from '@/server/http/handler';
import { getPositionDetails } from '@/server/services/chart-service';

export const GET = apiHandler('positions:read', async (ctx, params) => {
  const details = await getPositionDetails(ctx.organisationId, params.id ?? '', ctx.actor);
  return json(details);
});
