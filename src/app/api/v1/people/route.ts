import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { CreatePersonBody, createPersonFromFields } from '@/server/services/people-service';

export const GET = apiHandler('people:read', async (ctx) => {
  const url = new URL(ctx.request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const take = Math.min(Number(url.searchParams.get('take') ?? '50'), 250);
  const skip = Math.max(Number(url.searchParams.get('skip') ?? '0'), 0);

  const people = await prisma.person.findMany({
    where: {
      organisationId: ctx.organisationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    skip,
    take,
    include: {
      assignments: {
        where: { deletedAt: null, endDate: null, isPrimary: true },
        include: {
          position: { include: { department: true, location: true } },
        },
      },
      groupMemberships: {
        include: { group: true },
      },
      skills: {
        include: { skill: true },
      },
    },
  });

  const total = await prisma.person.count({
    where: { organisationId: ctx.organisationId, deletedAt: null },
  });

  return json({ people, total, skip, take });
});

export const POST = apiHandler('people:write', async (ctx) => {
  const body = CreatePersonBody.parse(await ctx.request.json());
  const created = await createPersonFromFields({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    body,
  });
  return json(created, 201);
});
