import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { applyScenarioOverlay, diffPrimaryManagers, type ScenarioChangeView } from '@/domain/scenario/overlay';
import { loadOrganisationGraph } from '@/repositories/org-repository';

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function toChangeViews(
  changes: Array<{ sequence: number; changeType: string; entityId: string | null; payload: unknown }>,
): ScenarioChangeView[] {
  return changes.map((change) => ({
    sequence: change.sequence,
    changeType: change.changeType,
    entityId: change.entityId,
    payload: jsonObject(change.payload),
  }));
}

export async function listScenarios(organisationId: string) {
  const scenarios = await prisma.scenario.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { changes: true } } },
  });
  return scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    status: scenario.status,
    changeCount: scenario._count.changes,
  }));
}

export async function loadLiveOrOverlayGraph(organisationId: string, scenarioId?: string | null) {
  const live = await loadOrganisationGraph(organisationId);
  if (!scenarioId) {
    return {
      live,
      graphInput: live,
      plannedPositionIds: new Set<string>(),
      movedPositionIds: new Set<string>(),
      scenario: null as { id: string; name: string } | null,
      diff: { added: [] as Array<{ positionId: string; title: string }>, moved: [] as Array<{ positionId: string; title: string; from: string | null; to: string | null }>, addedCount: 0, movedCount: 0 },
      changes: [] as Array<{ sequence: number; changeType: string; entityId: string | null; payload: unknown }>,
    };
  }

  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, organisationId, deletedAt: null },
    include: { changes: { orderBy: { sequence: 'asc' } } },
  });
  if (!scenario) {
    throw new NotFoundError('Scenario not found.');
  }

  const overlay = applyScenarioOverlay(
    {
      positions: live.positions,
      people: live.people,
      assignments: live.assignments,
      relationships: live.relationships,
    },
    toChangeViews(scenario.changes),
  );
  const diff = diffPrimaryManagers(live, overlay);

  return {
    live,
    graphInput: {
      ...live,
      positions: overlay.positions,
      people: overlay.people,
      assignments: overlay.assignments,
      relationships: overlay.relationships,
    },
    plannedPositionIds: new Set(overlay.plannedPositionIds),
    movedPositionIds: new Set(overlay.movedPositionIds),
    scenario: { id: scenario.id, name: scenario.name },
    diff,
    changes: scenario.changes,
  };
}

export async function getScenarioDetail(organisationId: string, scenarioId: string) {
  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, organisationId, deletedAt: null },
    include: {
      changes: { orderBy: { sequence: 'asc' } },
      baseSnapshot: { select: { id: true, name: true } },
    },
  });
  if (!scenario) {
    throw new NotFoundError('Scenario not found.');
  }
  const overlay = await loadLiveOrOverlayGraph(organisationId, scenarioId);
  const titles = new Map(overlay.graphInput.positions.map((position) => [position.id, position.title]));
  return {
    scenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      status: scenario.status,
      baseSnapshot: scenario.baseSnapshot,
      createdAt: scenario.createdAt,
    },
    changes: scenario.changes.map((change) => ({
      id: change.id,
      sequence: change.sequence,
      changeType: change.changeType,
      entityId: change.entityId,
      payload: jsonObject(change.payload),
      createdAt: change.createdAt,
    })),
    diff: {
      ...overlay.diff,
      added: overlay.diff.added,
      moved: overlay.diff.moved.map((item) => ({
        ...item,
        fromTitle: item.from ? (titles.get(item.from) ?? 'Unknown seat') : 'Top of chart',
        toTitle: item.to ? (titles.get(item.to) ?? 'Unknown seat') : 'Top of chart',
      })),
    },
  };
}
