import { describe, expect, it } from 'vitest';
import { applyScenarioOverlay, diffPrimaryManagers } from './overlay';
import type { OverlayGraph } from './overlay';

function graph(): OverlayGraph {
  return {
    positions: [
      {
        id: 'ceo',
        title: 'CEO',
        code: null,
        departmentId: null,
        locationId: null,
        positionType: 'SINGLE',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        sortOrder: null,
      },
      {
        id: 'eng',
        title: 'Engineer',
        code: null,
        departmentId: null,
        locationId: null,
        positionType: 'SINGLE',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        sortOrder: null,
      },
    ],
    people: [],
    assignments: [],
    relationships: [
      {
        id: 'r1',
        subordinatePositionId: 'eng',
        managerPositionId: 'ceo',
        relationshipType: 'PRIMARY',
        isPrimary: true,
      },
    ],
  };
}

describe('applyScenarioOverlay', () => {
  it('moves a reporting line without mutating the source graph', () => {
    const source = graph();
    const result = applyScenarioOverlay(source, [
      {
        sequence: 1,
        changeType: 'MOVE_POSITION',
        entityId: 'eng',
        payload: { managerPositionId: 'ceo' },
      },
    ]);
    expect(source.relationships[0]?.managerPositionId).toBe('ceo');
    expect(result.movedPositionIds).toEqual([]);
  });

  it('adds a planned vacancy reporting to a manager', () => {
    const result = applyScenarioOverlay(graph(), [
      {
        sequence: 1,
        changeType: 'ADD_POSITION',
        entityId: 'vac-1',
        payload: { title: 'Designer', managerPositionId: 'ceo' },
      },
    ]);
    expect(result.positions.some((position) => position.id === 'vac-1')).toBe(true);
    expect(result.plannedPositionIds).toEqual(['vac-1']);
    expect(result.relationships.some((rel) => rel.subordinatePositionId === 'vac-1')).toBe(true);
  });
});

describe('diffPrimaryManagers', () => {
  it('reports a move when the overlay parent changes', () => {
    const live = graph();
    live.positions.push({
      id: 'cfo',
      title: 'CFO',
      code: null,
      departmentId: null,
      locationId: null,
      positionType: 'SINGLE',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      sortOrder: null,
    });
    const planned = applyScenarioOverlay(live, [
      {
        sequence: 1,
        changeType: 'MOVE_POSITION',
        entityId: 'eng',
        payload: { managerPositionId: 'cfo' },
      },
    ]);
    const diff = diffPrimaryManagers(live, planned);
    expect(diff.movedCount).toBe(1);
    expect(diff.moved[0]?.to).toBe('cfo');
    expect(planned.movedPositionIds).toEqual(['eng']);
  });
});
