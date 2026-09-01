import { prisma } from '@/lib/db';
import { assertAcyclicPrimaryGraph, assertNoSelfReporting } from '@/domain/org/cycle';
import { getCorrelationId } from '@/lib/correlation';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import type { Actor } from '@/domain/permissions/policy';
import { can } from '@/domain/permissions/policy';

export type ChartMode = 'LIVE' | 'PLANNING';

export async function reparentPosition(input: {
  organisationId: string;
  actor: Actor;
  subordinatePositionId: string;
  managerPositionId: string;
  mode: ChartMode;
  scenarioId?: string;
}) {
  if (!can(input.actor, 'relationships:write')) {
    throw new ForbiddenError();
  }

  assertNoSelfReporting(input.subordinatePositionId, input.managerPositionId);

  if (input.mode === 'PLANNING') {
    if (!input.scenarioId) {
      throw new ConflictError('Planning mode requires a scenario.');
    }
    return writeScenarioMove(input);
  }

  return prisma.$transaction(async (tx) => {
    const [subordinate, manager] = await Promise.all([
      tx.position.findFirst({
        where: { id: input.subordinatePositionId, organisationId: input.organisationId, deletedAt: null },
      }),
      tx.position.findFirst({
        where: { id: input.managerPositionId, organisationId: input.organisationId, deletedAt: null },
      }),
    ]);

    if (!subordinate || !manager) {
      throw new NotFoundError('Position not found.');
    }

    const current = await tx.reportingRelationship.findMany({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        effectiveTo: null,
        isPrimary: true,
      },
      select: { subordinatePositionId: true, managerPositionId: true },
    });

    assertAcyclicPrimaryGraph(current, {
      subordinatePositionId: input.subordinatePositionId,
      managerPositionId: input.managerPositionId,
    });

    const existing = await tx.reportingRelationship.findFirst({
      where: {
        organisationId: input.organisationId,
        subordinatePositionId: input.subordinatePositionId,
        isPrimary: true,
        effectiveTo: null,
        deletedAt: null,
      },
    });

    if (existing && existing.managerPositionId === input.managerPositionId) {
      return { unchanged: true, relationshipId: existing.id };
    }

    const now = new Date();
    if (existing) {
      await tx.reportingRelationship.update({
        where: { id: existing.id },
        data: { effectiveTo: now, deletedAt: now },
      });
    }

    const created = await tx.reportingRelationship.create({
      data: {
        organisationId: input.organisationId,
        subordinatePositionId: input.subordinatePositionId,
        managerPositionId: input.managerPositionId,
        relationshipType: 'PRIMARY',
        isPrimary: true,
        effectiveFrom: now,
      },
    });

    await tx.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actor.userId,
        actorType: 'USER',
        action: 'MOVE_POSITION',
        entityType: 'ReportingRelationship',
        entityId: created.id,
        previousState: existing
          ? {
              subordinatePositionId: existing.subordinatePositionId,
              managerPositionId: existing.managerPositionId,
            }
          : undefined,
        newState: {
          subordinatePositionId: created.subordinatePositionId,
          managerPositionId: created.managerPositionId,
        },
        source: 'LOCAL',
        correlationId: getCorrelationId(),
      },
    });

    return { unchanged: false, relationshipId: created.id };
  });
}

async function writeScenarioMove(input: {
  organisationId: string;
  actor: Actor;
  subordinatePositionId: string;
  managerPositionId: string;
  scenarioId?: string;
}) {
  const scenario = await prisma.scenario.findFirst({
    where: { id: input.scenarioId, organisationId: input.organisationId, deletedAt: null },
    include: { changes: { orderBy: { sequence: 'desc' }, take: 1 } },
  });
  if (!scenario) {
    throw new NotFoundError('Scenario not found.');
  }

  const sequence = (scenario.changes[0]?.sequence ?? 0) + 1;
  const change = await prisma.scenarioChange.create({
    data: {
      scenarioId: scenario.id,
      sequence,
      changeType: 'MOVE_POSITION',
      entityType: 'Position',
      entityId: input.subordinatePositionId,
      payload: { managerPositionId: input.managerPositionId },
      createdById: input.actor.userId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actor.userId,
      actorType: 'USER',
      action: 'MOVE_POSITION',
      entityType: 'ScenarioChange',
      entityId: change.id,
      newState: change.payload as object,
      source: 'LOCAL',
      correlationId: getCorrelationId(),
    },
  });

  return { unchanged: false, scenarioChangeId: change.id, liveUntouched: true };
}
