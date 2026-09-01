import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { setPrivacyReview } from '@/server/services/assistant-service';

const Body = z.object({
  privacyReviewComplete: z.boolean(),
});

export const PATCH = apiHandler('org:admin', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const settings = await setPrivacyReview(ctx.organisationId, body.privacyReviewComplete);
  return json({ settings });
});
