import { apiHandler, json } from '@/server/http/handler';
import { searchOrganisation } from '@/server/services/search-service';

export const GET = apiHandler('org:read', async (ctx) => {
  const q = new URL(ctx.request.url).searchParams.get('q') ?? '';
  const results = await searchOrganisation(ctx.organisationId, q);
  return json({ results });
});
