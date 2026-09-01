import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { addPersonSkill, listPersonSkills, removePersonSkill } from '@/server/services/skill-service';

export const GET = apiHandler('people:read', async (ctx, params) => {
  const skills = await listPersonSkills(ctx.organisationId, params.id ?? '');
  return json({ skills });
});

const AddBody = z.object({
  name: z.string().min(1).max(60),
});

export const POST = apiHandler('people:write', async (ctx, params) => {
  const body = AddBody.parse(await ctx.request.json());
  const row = await addPersonSkill({
    organisationId: ctx.organisationId,
    personId: params.id ?? '',
    name: body.name,
    source: 'MANUAL',
    locked: true,
  });
  return json({ skill: { id: row.skillId, name: row.skill.name, source: row.source } }, 201);
});

export const DELETE = apiHandler('people:write', async (ctx, params) => {
  const skillId = new URL(ctx.request.url).searchParams.get('skillId') ?? '';
  await removePersonSkill(ctx.organisationId, params.id ?? '', skillId);
  return json({ ok: true });
});
