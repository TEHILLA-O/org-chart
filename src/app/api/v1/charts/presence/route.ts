import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { heartbeatPresence } from '@/server/services/presence-service';

const Body = z.object({
  focusPositionId: z.string().uuid().nullable().optional(),
});

export const POST = apiHandler('charts:read', async (ctx) => {
  const body = Body.parse(await ctx.request.json().catch(() => ({})));
  const presence = await heartbeatPresence({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    focusPositionId: body.focusPositionId,
  });
  return json(presence);
});
