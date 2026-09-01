import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { previewProfileLink } from '@/server/services/profile-link-service';
import { ValidationAppError } from '@/lib/errors';

const Body = z.object({
  input: z.string().min(2).max(400),
});

export const POST = apiHandler('people:write', async (ctx) => {
  const { input } = Body.parse(await ctx.request.json());
  try {
    const draft = await previewProfileLink(input);
    return json({ draft });
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationAppError(error.message);
    }
    throw error;
  }
});
