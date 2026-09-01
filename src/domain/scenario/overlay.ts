import type {
  AssignmentSnapshot,
  PositionSnapshot,
  RelationshipSnapshot,
} from '../org/types';

export interface OverlayGraph {
  positions: PositionSnapshot[];
  people: import('../org/types').PersonSnapshot[];
  assignments: AssignmentSnapshot[];
  relationships: RelationshipSnapshot[];
}

export interface ScenarioChangeView {
  sequence: number;
  changeType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
}

export interface OverlayResult extends OverlayGraph {
  movedPositionIds: string[];
  plannedPositionIds: string[];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function applyScenarioOverlay(input: OverlayGraph, changes: ScenarioChangeView[]): OverlayResult {
  const positions = [...input.positions];
  const people = [...input.people];
  const assignments = [...input.assignments];
  const relationships = [...input.relationships];
  const originalParent = new Map(
    input.relationships
      .filter((rel) => rel.isPrimary)
      .map((rel) => [rel.subordinatePositionId, rel.managerPositionId]),
  );
  const plannedPositionIds = new Set<string>();

  const ordered = [...changes].sort((a, b) => a.sequence - b.sequence);

  for (const change of ordered) {
    if (change.changeType === 'MOVE_POSITION' && change.entityId) {
      const managerPositionId = asString(change.payload.managerPositionId);
      if (!managerPositionId) continue;
      let found = false;
      for (let i = 0; i < relationships.length; i += 1) {
        const rel = relationships[i]!;
        if (rel.isPrimary && rel.subordinatePositionId === change.entityId) {
          relationships[i] = { ...rel, managerPositionId };
          found = true;
        }
      }
      if (!found) {
        relationships.push({
          id: `planned-rel-${change.entityId}`,
          subordinatePositionId: change.entityId,
          managerPositionId,
          relationshipType: 'PRIMARY',
          isPrimary: true,
        });
      }
    }

    if (change.changeType === 'ADD_POSITION' && change.entityId) {
      const title = asString(change.payload.title) ?? 'Planned role';
      const managerPositionId = asString(change.payload.managerPositionId);
      positions.push({
        id: change.entityId,
        title,
        code: null,
        departmentId: asString(change.payload.departmentId),
        locationId: asString(change.payload.locationId),
        positionType: 'SINGLE',
        employmentType: 'FULL_TIME',
        status: 'VACANT',
        sortOrder: null,
      });
      if (managerPositionId) {
        relationships.push({
          id: `planned-rel-${change.entityId}`,
          subordinatePositionId: change.entityId,
          managerPositionId,
          relationshipType: 'PRIMARY',
          isPrimary: true,
        });
      }
      plannedPositionIds.add(change.entityId);
    }
  }

  const movedPositionIds: string[] = [];
  for (const rel of relationships) {
    if (!rel.isPrimary || plannedPositionIds.has(rel.subordinatePositionId)) continue;
    const from = originalParent.get(rel.subordinatePositionId) ?? null;
    if (from !== rel.managerPositionId) {
      movedPositionIds.push(rel.subordinatePositionId);
    }
  }

  return {
    positions,
    people,
    assignments,
    relationships,
    movedPositionIds,
    plannedPositionIds: [...plannedPositionIds],
  };
}

export function diffPrimaryManagers(live: OverlayGraph, planned: OverlayGraph) {
  const liveParent = new Map(
    live.relationships
      .filter((rel) => rel.isPrimary)
      .map((rel) => [rel.subordinatePositionId, rel.managerPositionId]),
  );
  const plannedParent = new Map(
    planned.relationships
      .filter((rel) => rel.isPrimary)
      .map((rel) => [rel.subordinatePositionId, rel.managerPositionId]),
  );
  const liveIds = new Set(live.positions.map((position) => position.id));
  const plannedIds = new Set(planned.positions.map((position) => position.id));

  const added = [...plannedIds]
    .filter((id) => !liveIds.has(id))
    .map((id) => ({
      positionId: id,
      title: planned.positions.find((position) => position.id === id)?.title ?? 'Planned role',
    }));

  const moved: Array<{ positionId: string; title: string; from: string | null; to: string | null }> = [];
  for (const position of planned.positions) {
    if (!liveIds.has(position.id)) continue;
    const from = liveParent.get(position.id) ?? null;
    const to = plannedParent.get(position.id) ?? null;
    if (from !== to) {
      moved.push({ positionId: position.id, title: position.title, from, to });
    }
  }

  return { added, moved, addedCount: added.length, movedCount: moved.length };
}
