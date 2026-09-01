import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { applySuggestions, suggestForPerson } from '@/server/services/skill-service';
import { fetchGithubLanguages } from '@/server/services/profile-link-service';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/demo/mode';

const Body = z.object({
  linkedInText: z.string().max(4000).optional(),
  apply: z.boolean().optional(),
});

export const POST = apiHandler('people:write', async (ctx, params) => {
  const personId = params.id ?? '';
  const body = Body.parse(await ctx.request.json().catch(() => ({})));
  const person = isDemoMode()
    ? null
    : await prisma.person.findFirst({
        where: { id: personId, organisationId: ctx.organisationId, deletedAt: null },
        select: { profileLinkProvider: true, profileLinkUsername: true },
      });
  const githubLanguages =
    person?.profileLinkProvider === 'GITHUB' && person.profileLinkUsername
      ? await fetchGithubLanguages(person.profileLinkUsername)
      : [];
  const suggestions = await suggestForPerson(ctx.organisationId, personId, {
    linkedInText: body.linkedInText,
    githubLanguages,
  });
  if (body.apply) {
    const skills = await applySuggestions({
      organisationId: ctx.organisationId,
      personId,
      suggestions,
    });
    return json({ suggestions, skills });
  }
  return json({ suggestions });
});
