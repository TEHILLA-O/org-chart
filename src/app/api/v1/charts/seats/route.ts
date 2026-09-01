import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { addSeat } from '@/server/services/chart-edit-service';

const Body = z.object({
  displayName: z.string().min(1).max(160),
  title: z.string().min(2).max(120),
  managerPositionId: z.string().uuid().nullable().optional(),
});

export const POST = apiHandler('people:write', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const created = await addSeat({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    displayName: body.displayName,
    title: body.title,
    managerPositionId: body.managerPositionId,
  });
  return json(created, 201);
});
