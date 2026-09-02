import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { connectRippling } from '@/server/services/rippling-sync-service';

const Body = z.object({
  apiToken: z.string().min(8).max(4000),
});

export const POST = apiHandler('integrations:manage', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const result = await connectRippling(ctx.organisationId, body.apiToken);
  return json(result);
});
