import { type ReportingGraph } from '../org/graph';
import { DEFAULT_SPAN_THRESHOLD } from '../org/health';

export type ChartEdgeKind = 'PRIMARY' | 'SECONDARY';

export interface ChartLookups {
  departments: ReadonlyMap<string, { name: string; colour: string | null }>;
  locations: ReadonlyMap<string, { name: string }>;
  groups?: ReadonlyMap<string, { name: string }>;
}

export interface ChartNodeModel {
  id: string;
  positionId: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentColour: string | null;
  locationId: string | null;
  locationName: string | null;
  positionType: string;
  isVacant: boolean;
  isAssistant: boolean;
  hasSecondary: boolean;
  overloaded: boolean;
  managerName: string | null;
  managerTitle: string | null;
  directReportCount: number;
  downstreamCount: number;
  collapsed: boolean;
  planned?: boolean;
  moved?: boolean;
    occupants: Array<{
      personId: string;
      displayName: string;
      preferredName: string | null;
      profilePhotoUrl: string | null;
      email: string | null;
      isPrimary: boolean;
      status: string;
      holidayRemainingDays: number | null;
    }>;
    groupIds: string[];
    groupNames: string[];
  }

export interface ChartEdgeModel {
  id: string;
  source: string;
  target: string;
  kind: ChartEdgeKind;
}

export function projectToChartModel(
  graph: ReportingGraph,
  renderedIds: ReadonlySet<string>,
  collapsedPositionIds: ReadonlySet<string>,
  showSecondaryLines: boolean,
  lookups?: ChartLookups,
  flags?: { plannedPositionIds?: ReadonlySet<string>; movedPositionIds?: ReadonlySet<string> },
): { nodes: ChartNodeModel[]; edges: ChartEdgeModel[] } {
  const nodes: ChartNodeModel[] = [];
  const edges: ChartEdgeModel[] = [];

  for (const id of renderedIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;

    const departmentId = node.position.departmentId;
    const locationId = node.position.locationId;
    const department = departmentId ? lookups?.departments.get(departmentId) : undefined;
    const location = locationId ? lookups?.locations.get(locationId) : undefined;
    const managerId = graph.parent.get(id);
    const manager = managerId ? graph.nodes.get(managerId) : null;
    const groupIds = [...new Set(node.occupants.flatMap((occupant) => occupant.person.groupIds ?? []))];
    const groupNames = groupIds
      .map((groupId) => lookups?.groups?.get(groupId)?.name)
      .filter((name): name is string => Boolean(name));

    nodes.push({
      id,
      positionId: id,
      title: node.position.title,
      departmentId,
      departmentName: department?.name ?? null,
      departmentColour: department?.colour ?? null,
      locationId,
      locationName: location?.name ?? null,
      positionType: node.position.positionType,
      isVacant: node.isVacant,
      isAssistant: node.position.positionType === 'ASSISTANT',
      hasSecondary: (graph.secondaryParents.get(id)?.length ?? 0) > 0,
      overloaded: node.directReportIds.length >= DEFAULT_SPAN_THRESHOLD,
      managerName: manager?.occupants[0]?.person.displayName ?? (manager ? 'Vacant' : null),
      managerTitle: manager?.position.title ?? null,
      directReportCount: node.directReportIds.length,
      downstreamCount: graph.descendantCounts.get(id) ?? 0,
      collapsed: collapsedPositionIds.has(id) && node.directReportIds.length > 0,
      planned: flags?.plannedPositionIds?.has(id) ?? false,
      moved: flags?.movedPositionIds?.has(id) ?? false,
      occupants: node.occupants.map((occupant) => ({
        personId: occupant.person.id,
        displayName: occupant.person.displayName,
        preferredName: occupant.person.preferredName,
        profilePhotoUrl: occupant.person.profilePhotoUrl,
        email: occupant.person.email,
        isPrimary: occupant.assignment.isPrimary,
        status: occupant.person.status,
        holidayRemainingDays: occupant.person.holidayRemainingDays ?? null,
      })),
      groupIds,
      groupNames,
    });

    const parentId = graph.parent.get(id);
    if (parentId && renderedIds.has(parentId)) {
      edges.push({
        id: `primary:${parentId}->${id}`,
        source: parentId,
        target: id,
        kind: 'PRIMARY',
      });
    }

    if (showSecondaryLines) {
      for (const secondaryId of graph.secondaryParents.get(id) ?? []) {
        if (!renderedIds.has(secondaryId)) continue;
        edges.push({
          id: `secondary:${secondaryId}->${id}`,
          source: secondaryId,
          target: id,
          kind: 'SECONDARY',
        });
      }
    }
  }

  return { nodes, edges };
}
