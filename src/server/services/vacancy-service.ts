import { prisma } from '@/lib/db';
import { getCorrelationId } from '@/lib/correlation';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { can, type Actor } from '@/domain/permissions/policy';

export async function createVacancy(input: {
  organisationId: string;
  actor: Actor;
  title: string;
  managerPositionId: string;
  departmentId?: string | null;
  locationId?: string | null;
}) {
  if (!can(input.actor, 'positions:write')) {
    throw new ForbiddenError();
  }

  const manager = await prisma.position.findFirst({
    where: { id: input.managerPositionId, organisationId: input.organisationId, deletedAt: null },
  });
  if (!manager) {
    throw new NotFoundError('Manager position not found.');
  }

  return prisma.$transaction(async (tx) => {
    const position = await tx.position.create({
      data: {
        organisationId: input.organisationId,
        title: input.title,
        departmentId: input.departmentId ?? manager.departmentId,
        locationId: input.locationId ?? manager.locationId,
        positionType: 'SINGLE',
        status: 'VACANT',
        employmentType: manager.employmentType,
      },
    });

    await tx.reportingRelationship.create({
      data: {
        organisationId: input.organisationId,
        subordinatePositionId: position.id,
        managerPositionId: manager.id,
        relationshipType: 'PRIMARY',
        isPrimary: true,
      },
    });

    await tx.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actor.userId,
        actorType: 'USER',
        action: 'CREATE',
        entityType: 'Position',
        entityId: position.id,
        newState: { title: position.title, status: 'VACANT', managerPositionId: manager.id },
        source: 'LOCAL',
        correlationId: getCorrelationId(),
      },
    });

    return position;
  });
}
