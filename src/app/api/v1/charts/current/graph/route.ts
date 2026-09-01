import { apiHandler, json } from '@/server/http/handler';
import { getChartPayload } from '@/server/services/chart-service';
import { parseFilters } from '@/repositories/org-repository';

export const GET = apiHandler('charts:read', async (ctx) => {
  const url = new URL(ctx.request.url);
  const collapsed = url.searchParams.get('collapsed')?.split(',').filter(Boolean) ?? [];
  const payload = await getChartPayload({
    organisationId: ctx.organisationId,
    collapsedPositionIds: collapsed,
    filters: parseFilters(url.searchParams),
    focusPositionId: url.searchParams.get('focus') ?? undefined,
    scenarioId: url.searchParams.get('scenarioId') ?? undefined,
  });
  return json(payload);
});
