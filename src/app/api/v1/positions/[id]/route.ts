import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { getPositionDetails } from '@/server/services/chart-service';
import { removeSeat, updateSeat } from '@/server/services/chart-edit-service';

export const GET = apiHandler('positions:read', async (ctx, params) => {
  const scenarioId = new URL(ctx.request.url).searchParams.get('scenarioId');
  const details = await getPositionDetails(
    ctx.organisationId,
    params.id ?? '',
    ctx.actor,
    scenarioId,
  );
  return json(details);
});

const PatchBody = z.object({
  title: z.string().min(2).max(120).optional(),
  displayName: z.string().min(1).max(160).optional(),
});

export const PATCH = apiHandler('positions:write', async (ctx, params) => {
  const body = PatchBody.parse(await ctx.request.json());
  const result = await updateSeat({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    positionId: params.id ?? '',
    title: body.title,
    displayName: body.displayName,
  });
  return json(result);
});

export const DELETE = apiHandler('positions:write', async (ctx, params) => {
  const result = await removeSeat({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    positionId: params.id ?? '',
  });
  return json(result);
});
