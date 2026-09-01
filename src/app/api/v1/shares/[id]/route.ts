import { apiHandler, json } from '@/server/http/handler';
import { revokeShareLink } from '@/server/services/share-service';

export const DELETE = apiHandler('share:manage', async (ctx, params) => {
  const share = await revokeShareLink(ctx.organisationId, ctx.actor, params.id ?? '');
  return json({ share });
});
