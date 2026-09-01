import { apiHandler, json } from '@/server/http/handler';
import { CreateObjectiveBody, createObjective, listObjectives } from '@/server/services/okr-service';

export const GET = apiHandler('org:read', async (ctx) => {
  const objectives = await listObjectives(ctx.organisationId);
  return json({ objectives });
});

export const POST = apiHandler('org:write', async (ctx) => {
  const body = CreateObjectiveBody.parse(await ctx.request.json());
  const objective = await createObjective({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    body,
  });
  return json({ objective }, 201);
});
