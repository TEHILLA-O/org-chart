import { DomainError } from './cycle';
import {
  type AssignmentSnapshot,
  type PersonSnapshot,
  type PositionSnapshot,
  type RelationshipSnapshot,
  isActiveAssignment,
} from './types';

export interface Occupant {
  assignment: AssignmentSnapshot;
  person: PersonSnapshot;
}

export interface PositionNode {
  position: PositionSnapshot;
  occupants: Occupant[];
  isVacant: boolean;
  primaryManagerId: string | null;
  secondaryManagerIds: string[];
  directReportIds: string[];
}

export interface ReportingGraph {
  nodes: Map<string, PositionNode>;
  parent: Map<string, string>;
  children: Map<string, string[]>;
  secondaryParents: Map<string, string[]>;
  roots: string[];
  ancestorIndex: Map<string, string[]>;
  descendantCounts: Map<string, number>;
}

export interface GraphInput {
  positions: PositionSnapshot[];
  people: PersonSnapshot[];
  assignments: AssignmentSnapshot[];
  relationships: RelationshipSnapshot[];
  at?: Date;
}

export function buildReportingGraph(input: GraphInput): ReportingGraph {
  const at = input.at ?? new Date();
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const assignmentsByPosition = new Map<string, AssignmentSnapshot[]>();

  for (const assignment of input.assignments) {
    if (!isActiveAssignment(assignment, at)) continue;
    const list = assignmentsByPosition.get(assignment.positionId) ?? [];
    list.push(assignment);
    assignmentsByPosition.set(assignment.positionId, list);
  }

  const nodes = new Map<string, PositionNode>();
  for (const position of input.positions) {
    const rawAssignments = assignmentsByPosition.get(position.id) ?? [];
    const occupants: Occupant[] = [];
    for (const assignment of rawAssignments) {
      const person = peopleById.get(assignment.personId);
      if (!person) continue;
      occupants.push({ assignment, person });
    }
    occupants.sort((a, b) => Number(b.assignment.isPrimary) - Number(a.assignment.isPrimary));

    nodes.set(position.id, {
      position,
      occupants,
      isVacant: occupants.length === 0,
      primaryManagerId: null,
      secondaryManagerIds: [],
      directReportIds: [],
    });
  }

  const parent = new Map<string, string>();
  const children = new Map<string, string[]>();
  const secondaryParents = new Map<string, string[]>();

  for (const rel of input.relationships) {
    if (!nodes.has(rel.subordinatePositionId) || !nodes.has(rel.managerPositionId)) {
      continue;
    }
    if (rel.isPrimary || rel.relationshipType === 'PRIMARY') {
      parent.set(rel.subordinatePositionId, rel.managerPositionId);
      const list = children.get(rel.managerPositionId) ?? [];
      list.push(rel.subordinatePositionId);
      children.set(rel.managerPositionId, list);
    } else {
      const list = secondaryParents.get(rel.subordinatePositionId) ?? [];
      list.push(rel.managerPositionId);
      secondaryParents.set(rel.subordinatePositionId, list);
    }
  }

  for (const [id, node] of nodes) {
    node.primaryManagerId = parent.get(id) ?? null;
    node.secondaryManagerIds = secondaryParents.get(id) ?? [];
    node.directReportIds = children.get(id) ?? [];
  }

  const roots = [...nodes.keys()].filter((id) => !parent.has(id));

  const ancestorIndex = new Map<string, string[]>();
  const visiting = new Set<string>();

  const ancestorsOf = (id: string): string[] => {
    const cached = ancestorIndex.get(id);
    if (cached) return cached;
    if (visiting.has(id)) return [];
    visiting.add(id);
    const managerId = parent.get(id);
    const chain = managerId ? [managerId, ...ancestorsOf(managerId)] : [];
    visiting.delete(id);
    ancestorIndex.set(id, chain);
    return chain;
  };

  for (const id of nodes.keys()) {
    ancestorsOf(id);
  }

  const descendantCounts = new Map<string, number>();
  const countDescendants = (id: string): number => {
    const cached = descendantCounts.get(id);
    if (cached !== undefined) return cached;
    const kids = children.get(id) ?? [];
    let total = kids.length;
    for (const child of kids) {
      total += countDescendants(child);
    }
    descendantCounts.set(id, total);
    return total;
  };

  for (const id of nodes.keys()) {
    countDescendants(id);
  }

  return {
    nodes,
    parent,
    children,
    secondaryParents,
    roots,
    ancestorIndex,
    descendantCounts,
  };
}

export function reportingChain(graph: ReportingGraph, positionId: string): string[] {
  return [positionId, ...(graph.ancestorIndex.get(positionId) ?? [])];
}

export function requirePosition(graph: ReportingGraph, positionId: string): PositionNode {
  const node = graph.nodes.get(positionId);
  if (!node) {
    throw new DomainError('POSITION_NOT_FOUND', `Position ${positionId} is not in the graph.`);
  }
  return node;
}
