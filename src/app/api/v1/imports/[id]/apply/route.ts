import { apiHandler, json } from '@/server/http/handler';
import { applyImportJob } from '@/server/services/import-service';

export const POST = apiHandler('people:write', async (ctx, params) => {
  const payload = await applyImportJob(ctx.organisationId, ctx.actor, params.id ?? '');
  return json(payload);
});
