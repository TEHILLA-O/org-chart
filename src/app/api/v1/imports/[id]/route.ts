import { apiHandler, json } from '@/server/http/handler';
import { getImportJob } from '@/server/services/import-service';

export const GET = apiHandler('people:read', async (ctx, params) => {
  const payload = await getImportJob(ctx.organisationId, params.id ?? '');
  return json(payload);
});
