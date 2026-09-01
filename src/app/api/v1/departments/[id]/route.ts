import { apiHandler, json } from '@/server/http/handler';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { isDemoMode } from '@/demo/mode';
import { demoDepartmentDetail } from '@/demo/northstar';

export const GET = apiHandler('org:read', async (ctx, params) => {
  if (isDemoMode()) {
    const detail = demoDepartmentDetail(params.id ?? '');
    if (!detail) throw new NotFoundError('Department not found.');
    return json(detail);
  }
  const department = await prisma.department.findFirst({
    where: { id: params.id ?? '', organisationId: ctx.organisationId, deletedAt: null },
  });
  if (!department) throw new NotFoundError('Department not found.');

  const positions = await prisma.position.findMany({
    where: { organisationId: ctx.organisationId, departmentId: department.id, deletedAt: null },
    orderBy: { title: 'asc' },
    include: {
      location: true,
      assignments: {
        where: { deletedAt: null, endDate: null },
        include: { person: true },
        orderBy: { isPrimary: 'desc' },
      },
    },
  });

  const people = positions.flatMap((position) =>
    position.assignments.map((assignment) => ({
      personId: assignment.person.id,
      displayName: assignment.person.displayName,
      email: assignment.person.email,
      profilePhotoUrl: assignment.person.profilePhotoUrl,
      holidayRemainingDays: assignment.person.holidayRemainingDays,
      positionId: position.id,
      title: position.title,
      location: position.location?.name ?? null,
      isPrimary: assignment.isPrimary,
    })),
  );

  const vacant = positions
    .filter((position) => position.assignments.length === 0)
    .map((position) => ({
      positionId: position.id,
      title: position.title,
      location: position.location?.name ?? null,
    }));

  const head = department.headPositionId
    ? positions.find((position) => position.id === department.headPositionId)
    : null;

  return json({
    department,
    head: head
      ? {
          positionId: head.id,
          title: head.title,
          personName: head.assignments[0]?.person.displayName ?? 'Vacant',
        }
      : null,
    people,
    vacant,
    totals: {
      positions: positions.length,
      people: people.length,
      vacant: vacant.length,
    },
  });
});
