import { describe, expect, it } from 'vitest';
import { applyCollapseState } from '../chart/collapse';
import { applyFilters } from '../chart/filters';
import { projectToChartModel } from '../chart/project';
import { buildReportingGraph } from './graph';
import {
  type AssignmentSnapshot,
  type PersonSnapshot,
  type PositionSnapshot,
  type RelationshipSnapshot,
} from './types';

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

function position(id: string, title: string, departmentId: string | null = 'eng'): PositionSnapshot {
  return {
    id,
    title,
    code: id.toUpperCase(),
    departmentId,
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

describe('buildReportingGraph', () => {
  const people = [person('p-ceo', 'Amelia Shah'), person('p-cto', 'Noah Adeyemi')];
  const positions = [position('ceo', 'Chief Executive Officer', 'exec'), position('cto', 'Chief Technology Officer')];
  const assignments = [assignment('a1', 'p-ceo', 'ceo'), assignment('a2', 'p-cto', 'cto')];
  const relationships = [primary('cto', 'ceo')];

  it('separates people from positions and derives vacancy from assignments', () => {
    const vacant = position('vac', 'Staff Engineer');
    const graph = buildReportingGraph({
      people,
      positions: [...positions, vacant],
      assignments,
      relationships: [...relationships, primary('vac', 'cto')],
      at,
    });

    expect(graph.nodes.get('ceo')?.isVacant).toBe(false);
    expect(graph.nodes.get('vac')?.isVacant).toBe(true);
    expect(graph.nodes.get('vac')?.occupants).toHaveLength(0);
    expect(graph.parent.get('cto')).toBe('ceo');
    expect(graph.roots).toEqual(['ceo']);
  });

  it('indexes ancestors for search expansion', () => {
    const ic = position('ic', 'Engineer');
    const graph = buildReportingGraph({
      people,
      positions: [...positions, ic],
      assignments,
      relationships: [...relationships, primary('ic', 'cto')],
      at,
    });
    expect(graph.ancestorIndex.get('ic')).toEqual(['cto', 'ceo']);
    expect(graph.descendantCounts.get('ceo')).toBe(2);
  });

  it('keeps dotted-line managers off the primary parent map', () => {
    const graph = buildReportingGraph({
      people,
      positions,
      assignments,
      relationships: [
        ...relationships,
        {
          id: 'dot',
          subordinatePositionId: 'cto',
          managerPositionId: 'ceo',
          relationshipType: 'DOTTED_LINE',
          isPrimary: false,
        },
      ],
      at,
    });
    expect(graph.parent.get('cto')).toBe('ceo');
    expect(graph.secondaryParents.get('cto')).toContain('ceo');
  });
});

describe('chart pipeline', () => {
  it('prunes collapsed subtrees instead of hiding them in place', () => {
    const graph = buildReportingGraph({
      people: [person('p-ceo', 'Amelia Shah')],
      positions: [position('ceo', 'CEO', 'exec'), position('cto', 'CTO'), position('ic', 'Engineer')],
      assignments: [assignment('a1', 'p-ceo', 'ceo')],
      relationships: [primary('cto', 'ceo'), primary('ic', 'cto')],
      at,
    });
    const visible = new Set(graph.nodes.keys());
    const rendered = applyCollapseState(graph, new Set(['cto']), visible);
    expect(rendered.has('ceo')).toBe(true);
    expect(rendered.has('cto')).toBe(true);
    expect(rendered.has('ic')).toBe(false);
  });

  it('keeps ancestors when a department filter matches a leaf', () => {
    const graph = buildReportingGraph({
      people: [],
      positions: [
        position('ceo', 'CEO', 'exec'),
        position('cto', 'CTO', 'eng'),
        position('cfo', 'CFO', 'fin'),
      ],
      assignments: [],
      relationships: [primary('cto', 'ceo'), primary('cfo', 'ceo')],
      at,
    });
    const visible = applyFilters(graph, { departmentIds: ['eng'] });
    expect(visible.has('cto')).toBe(true);
    expect(visible.has('ceo')).toBe(true);
    expect(visible.has('cfo')).toBe(false);
  });

  it('filters chart nodes by person group membership', () => {
    const board = person('p-ceo', 'Amelia Shah');
    board.groupIds = ['board'];
    const ic = person('p-cto', 'Noah Adeyemi');
    ic.groupIds = ['employees'];
    const graph = buildReportingGraph({
      people: [board, ic],
      positions: [position('ceo', 'CEO', 'exec'), position('cto', 'CTO')],
      assignments: [assignment('a1', 'p-ceo', 'ceo'), assignment('a2', 'p-cto', 'cto')],
      relationships: [primary('cto', 'ceo')],
      at,
    });
    const visible = applyFilters(graph, { groupIds: ['board'] });
    expect(visible.has('ceo')).toBe(true);
    expect(visible.has('cto')).toBe(false);
  });

  it('projects vacant nodes and secondary edges distinctly', () => {
    const graph = buildReportingGraph({
      people: [person('p-ceo', 'Amelia Shah')],
      positions: [position('ceo', 'CEO', 'exec'), position('vac', 'Analyst', 'fin')],
      assignments: [assignment('a1', 'p-ceo', 'ceo')],
      relationships: [
        primary('vac', 'ceo'),
        {
          id: 'dot',
          subordinatePositionId: 'vac',
          managerPositionId: 'ceo',
          relationshipType: 'DOTTED_LINE',
          isPrimary: false,
        },
      ],
      at,
    });
    const { nodes, edges } = projectToChartModel(
      graph,
      new Set(graph.nodes.keys()),
      new Set(),
      true,
    );
    expect(nodes.find((node) => node.id === 'vac')?.isVacant).toBe(true);
    expect(nodes.find((node) => node.id === 'vac')?.hasSecondary).toBe(true);
    expect(nodes.find((node) => node.id === 'vac')?.departmentName).toBeNull();
    expect(edges.some((edge) => edge.kind === 'PRIMARY')).toBe(true);
    expect(edges.some((edge) => edge.kind === 'SECONDARY')).toBe(true);

    const labelled = projectToChartModel(
      graph,
      new Set(graph.nodes.keys()),
      new Set(),
      true,
      {
        departments: new Map([['fin', { name: 'Finance', colour: '#2f6f6a' }]]),
        locations: new Map([['london', { name: 'London' }]]),
      },
    );
    expect(labelled.nodes.find((node) => node.id === 'vac')?.departmentName).toBe('Finance');
    expect(labelled.nodes.find((node) => node.id === 'vac')?.locationName).toBe('London');
  });
});
