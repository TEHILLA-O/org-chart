import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { reparentPosition } from '@/server/services/reparent-service';

const Body = z.object({
  subordinatePositionId: z.string().uuid(),
  managerPositionId: z.string().uuid(),
  mode: z.enum(['LIVE', 'PLANNING']).default('LIVE'),
  scenarioId: z.string().uuid().optional(),
});

export const POST = apiHandler('relationships:write', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const result = await reparentPosition({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    subordinatePositionId: body.subordinatePositionId,
    managerPositionId: body.managerPositionId,
    mode: body.mode,
    scenarioId: body.scenarioId,
  });
  return json(result);
});
