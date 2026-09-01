import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';

export const GET = apiHandler('org:read', async (ctx) => {
  const departments = await prisma.department.findMany({
    where: { organisationId: ctx.organisationId, deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { positions: true } },
      positions: {
        where: { deletedAt: null },
        select: {
          assignments: {
            where: { deletedAt: null, endDate: null },
            select: { personId: true },
          },
        },
      },
    },
  });

  return json({
    departments: departments.map((department) => {
      const peopleIds = new Set(
        department.positions.flatMap((position) => position.assignments.map((row) => row.personId)),
      );
      return {
        id: department.id,
        name: department.name,
        code: department.code,
        colour: department.colour,
        peopleCount: peopleIds.size,
        positionCount: department._count.positions,
      };
    }),
  });
});
