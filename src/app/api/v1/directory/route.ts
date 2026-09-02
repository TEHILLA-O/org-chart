import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import {
  applyDirectoryPeople,
  listLiveDirectory,
  previewDirectorySource,
} from '@/server/services/directory-service';

export const GET = apiHandler('people:read', async (ctx) => {
  return json(await listLiveDirectory(ctx.organisationId));
});

const Body = z.object({
  connectorId: z.string().uuid(),
  apply: z.boolean().optional(),
});

export const POST = apiHandler('people:write', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const preview = await previewDirectorySource(ctx.organisationId, body.connectorId);
  if (!body.apply) {
    return json({ preview: preview.people, connector: preview.connector });
  }
  const result = await applyDirectoryPeople(
    ctx.organisationId,
    preview.people,
    preview.connector?.provider ?? 'SUPABASE',
  );
  return json({ preview: preview.people, connector: preview.connector, applied: result });
});
