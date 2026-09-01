import { z } from 'zod';
import { apiHandler, json } from '@/server/http/handler';
import { createVacancy } from '@/server/services/vacancy-service';
import { prisma } from '@/lib/db';

export const GET = apiHandler('positions:read', async (ctx) => {
  const positions = await prisma.position.findMany({
    where: { organisationId: ctx.organisationId, deletedAt: null },
    orderBy: { title: 'asc' },
    include: {
      department: true,
      location: true,
      assignments: {
        where: { deletedAt: null, endDate: null },
        include: { person: true },
      },
    },
  });
  return json({ positions });
});

const Body = z.object({
  title: z.string().min(2).max(120),
  managerPositionId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
});

export const POST = apiHandler('positions:write', async (ctx) => {
  const body = Body.parse(await ctx.request.json());
  const position = await createVacancy({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    title: body.title,
    managerPositionId: body.managerPositionId,
    departmentId: body.departmentId,
    locationId: body.locationId,
  });
  return json({ position }, 201);
});
