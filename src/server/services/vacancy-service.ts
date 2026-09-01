import { prisma } from '@/lib/db';
import { getCorrelationId } from '@/lib/correlation';
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors';
import { can, type Actor } from '@/domain/permissions/policy';
import { applyScenarioOverlay } from '@/domain/scenario/overlay';
import { assertAcyclicPrimaryGraph } from '@/domain/org/cycle';
import { loadLiveOrOverlayGraph, toChangeViews } from '@/server/services/scenario-service';
import { assertWritable } from '@/demo/mode';

export async function createVacancy(input: {
  organisationId: string;
  actor: Actor;
  title: string;
  managerPositionId: string;
  departmentId?: string | null;
  locationId?: string | null;
  mode?: 'LIVE' | 'PLANNING';
  scenarioId?: string;
}) {
  if (!can(input.actor, 'positions:write')) {
    throw new ForbiddenError();
  }
  assertWritable();

  if (input.mode === 'PLANNING') {
    return addPlannedVacancy(input);
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

async function addPlannedVacancy(input: {
  organisationId: string;
  actor: Actor;
  title: string;
  managerPositionId: string;
  departmentId?: string | null;
  locationId?: string | null;
  scenarioId?: string;
}) {
  if (!input.scenarioId) {
    throw new ConflictError('Planning mode requires a scenario.');
  }

  const scenario = await prisma.scenario.findFirst({
    where: { id: input.scenarioId, organisationId: input.organisationId, deletedAt: null },
    include: { changes: { orderBy: { sequence: 'desc' }, take: 1 } },
  });
  if (!scenario) {
    throw new NotFoundError('Scenario not found.');
  }

  const overlay = await loadLiveOrOverlayGraph(input.organisationId, scenario.id);
  if (!overlay.graphInput.positions.some((position) => position.id === input.managerPositionId)) {
    throw new NotFoundError('Manager position not found.');
  }

  const entityId = crypto.randomUUID();
  const proposed = applyScenarioOverlay(
    {
      positions: overlay.live.positions,
      people: overlay.live.people,
      assignments: overlay.live.assignments,
      relationships: overlay.live.relationships,
    },
    [
      ...toChangeViews(overlay.changes),
      {
        sequence: (scenario.changes[0]?.sequence ?? 0) + 1,
        changeType: 'ADD_POSITION',
        entityId,
        payload: {
          title: input.title,
          managerPositionId: input.managerPositionId,
          departmentId: input.departmentId ?? null,
          locationId: input.locationId ?? null,
        },
      },
    ],
  );
  assertAcyclicPrimaryGraph(
    proposed.relationships
      .filter((rel) => rel.isPrimary)
      .map((rel) => ({
        subordinatePositionId: rel.subordinatePositionId,
        managerPositionId: rel.managerPositionId,
      })),
  );

  const sequence = (scenario.changes[0]?.sequence ?? 0) + 1;
  const change = await prisma.scenarioChange.create({
    data: {
      scenarioId: scenario.id,
      sequence,
      changeType: 'ADD_POSITION',
      entityType: 'Position',
      entityId,
      payload: {
        title: input.title,
        managerPositionId: input.managerPositionId,
        departmentId: input.departmentId ?? null,
        locationId: input.locationId ?? null,
      },
      createdById: input.actor.userId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actor.userId,
      actorType: 'USER',
      action: 'CREATE',
      entityType: 'ScenarioChange',
      entityId: change.id,
      newState: { title: input.title, status: 'VACANT', managerPositionId: input.managerPositionId },
      source: 'LOCAL',
      correlationId: getCorrelationId(),
    },
  });

  return {
    id: entityId,
    title: input.title,
    status: 'VACANT',
    planned: true,
    liveUntouched: true,
  };
}
