import { describe, expect, it } from 'vitest';
import { buildReportingGraph } from './graph';
import { computeOrgHealth } from './health';
import type { AssignmentSnapshot, PersonSnapshot, PositionSnapshot, RelationshipSnapshot } from './types';

const at = new Date('2026-01-15T00:00:00Z');

function person(id: string, name: string): PersonSnapshot {
  const [firstName, lastName] = name.split(' ') as [string, string];
  return {
    id,
    displayName: name,
    preferredName: null,
    firstName,
    lastName,
    email: `${id}@northstar.example`,
    phone: null,
    profilePhotoUrl: null,
    status: 'ACTIVE',
  };
}

function position(id: string, title: string): PositionSnapshot {
  return {
    id,
    title,
    code: id.toUpperCase(),
    departmentId: 'eng',
    locationId: 'london',
    positionType: 'SINGLE',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    sortOrder: null,
  };
}

function assignment(id: string, personId: string, positionId: string): AssignmentSnapshot {
  return {
    id,
    personId,
    positionId,
    isPrimary: true,
    allocationPercentage: 100,
    assignmentType: 'PERMANENT',
    startDate: new Date('2020-01-01'),
    endDate: null,
  };
}

function primary(sub: string, mgr: string): RelationshipSnapshot {
  return {
    id: `${sub}-${mgr}`,
    subordinatePositionId: sub,
    managerPositionId: mgr,
    relationshipType: 'PRIMARY',
    isPrimary: true,
  };
}

describe('computeOrgHealth', () => {
  it('reports vacancy rate and overloaded span of control', () => {
    const people = [person('p-ceo', 'Amelia Shah'), person('p-m', 'Noah Adeyemi')];
    const positions = [position('ceo', 'CEO'), position('mgr', 'Engineering Manager'), position('vac', 'Analyst')];
    const assignments = [assignment('a1', 'p-ceo', 'ceo'), assignment('a2', 'p-m', 'mgr')];
    const reports = Array.from({ length: 8 }, (_, index) => position(`ic${index}`, `Engineer ${index}`));
    const relationships = [
      primary('mgr', 'ceo'),
      primary('vac', 'ceo'),
      ...reports.map((item) => primary(item.id, 'mgr')),
    ];

    const graph = buildReportingGraph({
      people,
      positions: [...positions, ...reports],
      assignments,
      relationships,
      at,
    });
    const health = computeOrgHealth(graph, { spanThreshold: 8 });

    expect(health.vacantPositions).toBe(9);
    expect(health.overloadedManagers.some((item) => item.positionId === 'mgr')).toBe(true);
    expect(health.maxSpan).toBeGreaterThanOrEqual(8);
  });
});
