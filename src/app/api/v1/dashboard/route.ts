import { apiHandler, json } from '@/server/http/handler';
import { loadDashboardMetrics } from '@/repositories/org-repository';
import { getOrgHealth } from '@/server/services/chart-service';

export const GET = apiHandler('org:read', async (ctx) => {
  const [metrics, health] = await Promise.all([
    loadDashboardMetrics(ctx.organisationId),
    getOrgHealth(ctx.organisationId),
  ]);
  return json({ ...metrics, health });
});
