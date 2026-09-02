import { buildReportingGraph, type PositionNode, type ReportingGraph } from '@/domain/org/graph';
import { loadOrganisationGraph } from '@/repositories/org-repository';

export interface AssistantSeat {
  personId: string | null;
  positionId: string;
  displayName: string;
  title: string;
  department: string | null;
  managerName: string | null;
  managerPositionId: string | null;
  reportCount: number;
  vacant: boolean;
}

export interface AssistantIndex {
  graph: ReportingGraph;
  seats: AssistantSeat[];
  departments: Array<{ id: string; name: string }>;
}

export function seatLabel(seat: AssistantSeat) {
  if (seat.vacant) return `Vacant · ${seat.title}`;
  return `${seat.displayName} · ${seat.title}`;
}

export async function loadAssistantIndex(organisationId: string): Promise<AssistantIndex> {
  const graphInput = await loadOrganisationGraph(organisationId);
  const graph = buildReportingGraph(graphInput);
  const departmentName = new Map(graphInput.departments.map((department) => [department.id, department.name]));

  const seats: AssistantSeat[] = [];
  for (const node of graph.nodes.values()) {
    seats.push(toSeat(graph, node, departmentName));
  }
  seats.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.title.localeCompare(b.title));

  return {
    graph,
    seats,
    departments: graphInput.departments.map((department) => ({ id: department.id, name: department.name })),
  };
}

export function compactRoster(seats: AssistantSeat[], limit = 180) {
  return seats
    .slice(0, limit)
    .map((seat) => {
      const who = seat.vacant ? `VACANT ${seat.title}` : `${seat.displayName} (${seat.title})`;
      const manager = seat.managerName ? `reports to ${seat.managerName}` : 'root';
      const dept = seat.department ? ` · ${seat.department}` : '';
      return `${who} · ${manager}${dept} · ${seat.reportCount} reports`;
    })
    .join('\n');
}

export function matchSeats(seats: AssistantSeat[], query: string): AssistantSeat[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const exact = seats.filter(
    (seat) => seat.displayName.toLowerCase() === needle || seat.title.toLowerCase() === needle,
  );
  if (exact.length === 1) return exact;
  const contained = seats.filter((seat) => {
    const haystack = `${seat.displayName} ${seat.title} ${seat.department ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
  return contained.slice(0, 12);
}

export function requireOneSeat(seats: AssistantSeat[], query: string, role: string) {
  const matches = matchSeats(seats, query);
  if (matches.length === 0) {
    return { ok: false as const, error: `No ${role} matched "${query}".` };
  }
  if (matches.length > 1) {
    return {
      ok: false as const,
      error: `Several ${role}s matched "${query}": ${matches.map(seatLabel).join('; ')}. Be more specific.`,
      matches,
    };
  }
  return { ok: true as const, seat: matches[0]! };
}

function toSeat(
  graph: ReportingGraph,
  node: PositionNode,
  departmentName: Map<string, string>,
): AssistantSeat {
  const occupant = node.occupants[0];
  const manager = node.primaryManagerId ? graph.nodes.get(node.primaryManagerId) : null;
  return {
    personId: occupant?.person.id ?? null,
    positionId: node.position.id,
    displayName: occupant?.person.displayName ?? 'Vacant',
    title: node.position.title,
    department: node.position.departmentId ? departmentName.get(node.position.departmentId) ?? null : null,
    managerName: manager?.occupants[0]?.person.displayName ?? (manager ? `Vacant ${manager.position.title}` : null),
    managerPositionId: node.primaryManagerId,
    reportCount: node.directReportIds.length,
    vacant: !occupant,
  };
}
