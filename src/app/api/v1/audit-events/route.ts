import { apiHandler, json } from '@/server/http/handler';
import { listAuditEvents } from '@/repositories/org-repository';

export const GET = apiHandler('audit:read', async (ctx) => {
  const take = Number(new URL(ctx.request.url).searchParams.get('take') ?? '40');
  const events = await listAuditEvents(ctx.organisationId, Number.isFinite(take) ? take : 40);
  return json({ events });
});
