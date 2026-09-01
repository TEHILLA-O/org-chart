import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { updateKeyResult } from '@/server/services/okr-service';

const Body = z.object({
  currentValue: z.number(),
});

export const PATCH = apiHandler('org:write', async (ctx, params) => {
  const body = Body.parse(await ctx.request.json());
  const keyResult = await updateKeyResult(ctx.organisationId, params.id ?? '', body.currentValue);
  return json({ keyResult });
});
