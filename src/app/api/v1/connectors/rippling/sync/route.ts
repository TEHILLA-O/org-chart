import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { syncRipplingWorkers } from '@/server/services/rippling-sync-service';

const Body = z.object({
  apply: z.boolean().optional(),
});

export const POST = apiHandler('integrations:manage', async (ctx) => {
  const body = Body.parse(await ctx.request.json().catch(() => ({})));
  const result = await syncRipplingWorkers(ctx.organisationId, ctx.actor.userId, body.apply === true);
  return json(result);
});
