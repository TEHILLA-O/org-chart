import { prisma } from '@/lib/db';
import { getCorrelationId } from '@/lib/correlation';
import { ForbiddenError, NotFoundError, ValidationAppError } from '@/lib/errors';
import { can, type Actor } from '@/domain/permissions/policy';
import { splitDisplayName } from '@/lib/utils';
import { assertWritable } from '@/demo/mode';
import { createPersonFromFields } from '@/server/services/people-service';

export async function updateSeat(input: {
  organisationId: string;
  actor: Actor;
  positionId: string;
  title?: string;
  displayName?: string;
}) {
  if (!can(input.actor, 'positions:write')) throw new ForbiddenError();
  assertWritable();

  const position = await prisma.position.findFirst({
    where: { id: input.positionId, organisationId: input.organisationId, deletedAt: null },
    include: {
      assignments: {
        where: { deletedAt: null, endDate: null, isPrimary: true },
        include: { person: true },
      },
    },
  });
  if (!position) throw new NotFoundError('Position not found.');

  const title = input.title?.trim();
  const displayName = input.displayName?.trim();
  const occupant = position.assignments[0]?.person;

  return prisma.$transaction(async (tx) => {
    if (title && title !== position.title) {
      await tx.position.update({ where: { id: position.id }, data: { title } });
    }

    if (displayName) {
      if (occupant) {
        const names = splitDisplayName(displayName);
        await tx.person.update({
          where: { id: occupant.id },
          data: {
            displayName,
            firstName: names.firstName,
            lastName: names.lastName,
          },
        });
      } else {
        const names = splitDisplayName(displayName);
        const person = await tx.person.create({
          data: {
            organisationId: input.organisationId,
            firstName: names.firstName,
            lastName: names.lastName,
            displayName,
            status: 'ACTIVE',
            startDate: new Date(),
          },
        });
        await tx.assignment.create({
          data: {
            organisationId: input.organisationId,
            personId: person.id,
            positionId: position.id,
            startDate: new Date(),
            isPrimary: true,
            allocationPercentage: 100,
          },
        });
        await tx.position.update({
          where: { id: position.id },
          data: { status: 'ACTIVE' },
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actor.userId,
        actorType: 'USER',
        action: 'UPDATE',
        entityType: 'Position',
        entityId: position.id,
        newState: { title: title ?? position.title, displayName: displayName ?? occupant?.displayName ?? null },
        source: 'LOCAL',
        correlationId: getCorrelationId(),
      },
    });

    return { positionId: position.id };
  });
}

export async function addSeat(input: {
  organisationId: string;
  actor: Actor;
  displayName: string;
  title: string;
  managerPositionId?: string | null;
}) {
  if (!can(input.actor, 'people:write')) throw new ForbiddenError();
  assertWritable();

  const names = splitDisplayName(input.displayName);
  if (!input.title.trim()) throw new ValidationAppError('Add a job title.');

  return createPersonFromFields({
    organisationId: input.organisationId,
    actor: input.actor,
    body: {
      firstName: names.firstName,
      lastName: names.lastName,
      displayName: input.displayName.trim(),
      title: input.title.trim(),
      managerPositionId: input.managerPositionId ?? undefined,
    },
  });
}

export async function removeSeat(input: {
  organisationId: string;
  actor: Actor;
  positionId: string;
}) {
  if (!can(input.actor, 'positions:write')) throw new ForbiddenError();
  assertWritable();

  const position = await prisma.position.findFirst({
    where: { id: input.positionId, organisationId: input.organisationId, deletedAt: null },
  });
  if (!position) throw new NotFoundError('Position not found.');

  const reports = await prisma.reportingRelationship.findMany({
    where: {
      organisationId: input.organisationId,
      managerPositionId: position.id,
      isPrimary: true,
      deletedAt: null,
    },
  });
  const managerLink = await prisma.reportingRelationship.findFirst({
    where: {
      organisationId: input.organisationId,
      subordinatePositionId: position.id,
      isPrimary: true,
      deletedAt: null,
    },
  });

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    if (managerLink) {
      for (const report of reports) {
        await tx.reportingRelationship.update({
          where: { id: report.id },
          data: { managerPositionId: managerLink.managerPositionId },
        });
      }
    } else {
      for (const report of reports) {
        await tx.reportingRelationship.update({
          where: { id: report.id },
          data: { deletedAt: now, isPrimary: false },
        });
      }
    }

    await tx.reportingRelationship.updateMany({
      where: { subordinatePositionId: position.id, deletedAt: null },
      data: { deletedAt: now, isPrimary: false },
    });
    await tx.assignment.updateMany({
      where: { positionId: position.id, deletedAt: null, endDate: null },
      data: { endDate: now, deletedAt: now },
    });
    await tx.position.update({
      where: { id: position.id },
      data: { deletedAt: now, status: 'CLOSED' },
    });
    await tx.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actor.userId,
        actorType: 'USER',
        action: 'DELETE',
        entityType: 'Position',
        entityId: position.id,
        newState: { removed: true, reportsMoved: reports.length },
        source: 'LOCAL',
        correlationId: getCorrelationId(),
      },
    });
    return { positionId: position.id };
  });
}
