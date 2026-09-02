import { apiHandler, json } from '@/server/http/handler';
import { reviewImportWithAgent } from '@/server/services/import-agent-service';

export const POST = apiHandler('people:write', async (ctx, params) => {
  const review = await reviewImportWithAgent(ctx.organisationId, params.id ?? '');
  return json(review);
});
