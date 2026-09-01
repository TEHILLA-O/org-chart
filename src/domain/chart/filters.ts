import { type ChartFilter, type PersonLifecycle, type PositionLifecycle } from '../org/types';
import { type ReportingGraph } from '../org/graph';

export interface FilterableNode {
  positionId: string;
  departmentId: string | null;
  locationId: string | null;
  positionStatus: PositionLifecycle;
  personStatuses: PersonLifecycle[];
  personIds: string[];
}

export function applyFilters(graph: ReportingGraph, filters: ChartFilter): Set<string> {
  const hasDepartment = Boolean(filters.departmentIds?.length);
  const hasLocation = Boolean(filters.locationIds?.length);
  const hasPersonStatus = Boolean(filters.personStatuses?.length);
  const hasPositionStatus = Boolean(filters.positionStatuses?.length);
  const hasPerson = Boolean(filters.personId);
  const hasManager = Boolean(filters.managerPositionId);
  const hasGroup = Boolean(filters.groupIds?.length);

  if (
    !hasDepartment &&
    !hasLocation &&
    !hasPersonStatus &&
    !hasPositionStatus &&
    !hasPerson &&
    !hasManager &&
    !hasGroup
  ) {
    return new Set(graph.nodes.keys());
  }

  const matched = new Set<string>();

  for (const [id, node] of graph.nodes) {
    if (hasDepartment && !filters.departmentIds!.includes(node.position.departmentId ?? '')) {
      continue;
    }
    if (hasLocation && !filters.locationIds!.includes(node.position.locationId ?? '')) {
      continue;
    }
    if (hasPositionStatus && !filters.positionStatuses!.includes(node.position.status) && !(node.isVacant && filters.positionStatuses!.includes('VACANT'))) {
      continue;
    }
    if (hasPersonStatus) {
      const statuses = node.occupants.map((occupant) => occupant.person.status);
      if (node.isVacant) {
        continue;
      }
      if (!statuses.some((status) => filters.personStatuses!.includes(status))) {
        continue;
      }
    }
    if (hasPerson && !node.occupants.some((occupant) => occupant.person.id === filters.personId)) {
      continue;
    }
    if (hasManager && node.primaryManagerId !== filters.managerPositionId) {
      continue;
    }
    if (hasGroup) {
      const inGroup = node.occupants.some((occupant) =>
        (occupant.person.groupIds ?? []).some((groupId) => filters.groupIds!.includes(groupId)),
      );
      if (!inGroup) continue;
    }
    matched.add(id);
  }

  const visible = new Set<string>();
  for (const id of matched) {
    visible.add(id);
    for (const ancestor of graph.ancestorIndex.get(id) ?? []) {
      visible.add(ancestor);
    }
  }

  return visible;
}

export function activeFilterCount(filters: ChartFilter): number {
  let count = 0;
  if (filters.departmentIds?.length) count += 1;
  if (filters.locationIds?.length) count += 1;
  if (filters.personStatuses?.length) count += 1;
  if (filters.positionStatuses?.length) count += 1;
  if (filters.personId) count += 1;
  if (filters.managerPositionId) count += 1;
  if (filters.groupIds?.length) count += 1;
  return count;
}
