import type { ReportingGraph } from './graph';

export const DEFAULT_SPAN_THRESHOLD = 8;

export interface ManagerSpan {
  positionId: string;
  title: string;
  personName: string;
  departmentId: string | null;
  directReportCount: number;
  overloaded: boolean;
}

export interface OrgHealth {
  totalPositions: number;
  vacantPositions: number;
  vacancyRate: number;
  spanThreshold: number;
  managerCount: number;
  medianSpan: number;
  maxSpan: number;
  overloadedManagers: ManagerSpan[];
  widestManagers: ManagerSpan[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return a;
  const b = sorted[mid - 1] ?? 0;
  return (a + b) / 2;
}

export function computeOrgHealth(
  graph: ReportingGraph,
  options?: { spanThreshold?: number },
): OrgHealth {
  const spanThreshold = options?.spanThreshold ?? DEFAULT_SPAN_THRESHOLD;
  const managers: ManagerSpan[] = [];
  let vacantPositions = 0;

  for (const [id, node] of graph.nodes) {
    if (node.isVacant) vacantPositions += 1;
    if (node.directReportIds.length === 0) continue;
    const span = node.directReportIds.length;
    managers.push({
      positionId: id,
      title: node.position.title,
      personName: node.occupants[0]?.person.displayName ?? 'Vacant',
      departmentId: node.position.departmentId,
      directReportCount: span,
      overloaded: span >= spanThreshold,
    });
  }

  managers.sort((a, b) => b.directReportCount - a.directReportCount);
  const spans = managers.map((item) => item.directReportCount);

  return {
    totalPositions: graph.nodes.size,
    vacantPositions,
    vacancyRate: graph.nodes.size === 0 ? 0 : vacantPositions / graph.nodes.size,
    spanThreshold,
    managerCount: managers.length,
    medianSpan: median(spans),
    maxSpan: spans[0] ?? 0,
    overloadedManagers: managers.filter((item) => item.overloaded),
    widestManagers: managers.slice(0, 12),
  };
}
