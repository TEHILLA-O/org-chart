import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { addPersonSkill, listSkills } from '@/server/services/skill-service';

export const GET = apiHandler('people:read', async (ctx) => {
  const skills = await listSkills(ctx.organisationId);
  return json({ skills });
});

const Body = z.object({
  personId: z.string().uuid(),
  name: z.string().min(1).max(60),
});

export const POST = apiHandler('people:write', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const row = await addPersonSkill({
    organisationId: ctx.organisationId,
    personId: body.personId,
    name: body.name,
    source: 'MANUAL',
    locked: true,
  });
  return json({ skill: { id: row.skillId, name: row.skill.name, source: row.source } }, 201);
});
