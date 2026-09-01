import { apiHandler, json } from '@/server/http/handler';
import { CreateGroupBody, createGroup, listGroups } from '@/server/services/group-service';

export const GET = apiHandler('org:read', async (ctx) => {
  const groups = await listGroups(ctx.organisationId);
  return json({ groups });
});

export const POST = apiHandler('org:write', async (ctx) => {
  const body = CreateGroupBody.parse(await ctx.request.json());
  const group = await createGroup({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    body,
  });
  return json({ group }, 201);
});
