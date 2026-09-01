import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { askOrganisation } from '@/server/services/assistant-service';

const Body = z.object({
  q: z.string().min(3).max(800),
});

export const POST = apiHandler('people:read', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const result = await askOrganisation(ctx.organisationId, body.q);
  return json(result);
});
