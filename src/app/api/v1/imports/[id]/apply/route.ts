import { apiHandler, json } from '@/server/http/handler';
import { applyImportJob } from '@/server/services/import-service';

export const POST = apiHandler('people:write', async (ctx, params) => {
  let replaceExisting = false;
  try {
    const body = (await ctx.request.json()) as { replaceExisting?: unknown };
    replaceExisting = body.replaceExisting === true;
  } catch {
    replaceExisting = false;
  }
  const payload = await applyImportJob(ctx.organisationId, ctx.actor, params.id ?? '', {
    replaceExisting,
  });
  return json(payload);
});
