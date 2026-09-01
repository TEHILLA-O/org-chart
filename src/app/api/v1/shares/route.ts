import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { createShareLink, listShareLinks } from '@/server/services/share-service';

export const GET = apiHandler('share:manage', async (ctx) => {
  return json(await listShareLinks(ctx.organisationId, ctx.actor));
});

const Body = z.object({
  allowEmbed: z.boolean().optional(),
  expiresInDays: z.number().int().positive().max(365).nullable().optional(),
  allowedFields: z.array(z.string()).optional(),
  password: z.string().min(8).max(100).optional(),
});

export const POST = apiHandler('share:manage', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const created = await createShareLink({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    allowEmbed: body.allowEmbed,
    expiresInDays: body.expiresInDays,
    allowedFields: body.allowedFields,
    password: body.password,
  });
  return json(created, 201);
});
