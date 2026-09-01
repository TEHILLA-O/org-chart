export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function assertNoSelfReporting(subordinatePositionId: string, managerPositionId: string): void {
  if (subordinatePositionId === managerPositionId) {
    throw new DomainError('SELF_REPORTING', 'A position cannot report to itself.');
  }
}

export interface PrimaryEdge {
  subordinatePositionId: string;
  managerPositionId: string;
}

export interface CycleDetectionResult {
  cyclic: boolean;
  path: string[];
}

/**
 * Detects cycles in the PRIMARY reporting graph.
 *
 * Non-primary edges are ignored: matrix / dotted-line relationships are
 * permitted to form cycles because real organisations contain them.
 *
 * `proposed` replaces any existing primary edge for the same subordinate,
 * modelling a reparent before it is written.
 */
export function detectPrimaryCycle(
  existing: readonly PrimaryEdge[],
  proposed?: PrimaryEdge,
): CycleDetectionResult {
  const parentByChild = new Map<string, string>();

  for (const edge of existing) {
    parentByChild.set(edge.subordinatePositionId, edge.managerPositionId);
  }

  if (proposed) {
    assertNoSelfReporting(proposed.subordinatePositionId, proposed.managerPositionId);
    parentByChild.set(proposed.subordinatePositionId, proposed.managerPositionId);
  }

  const UNVISITED = 0;
  const IN_STACK = 1;
  const DONE = 2;
  const colour = new Map<string, number>();
  const nodes = new Set<string>();

  for (const [child, parent] of parentByChild) {
    nodes.add(child);
    nodes.add(parent);
  }

  const stack: string[] = [];

  const visit = (node: string): string[] | null => {
    const state = colour.get(node) ?? UNVISITED;
    if (state === DONE) return null;
    if (state === IN_STACK) {
      const start = stack.indexOf(node);
      return start >= 0 ? [...stack.slice(start), node] : [node];
    }

    colour.set(node, IN_STACK);
    stack.push(node);

    const parent = parentByChild.get(node);
    if (parent) {
      const cycle = visit(parent);
      if (cycle) return cycle;
    }

    stack.pop();
    colour.set(node, DONE);
    return null;
  };

  for (const node of nodes) {
    const cycle = visit(node);
    if (cycle) {
      return { cyclic: true, path: cycle };
    }
  }

  return { cyclic: false, path: [] };
}

export function assertAcyclicPrimaryGraph(
  existing: readonly PrimaryEdge[],
  proposed?: PrimaryEdge,
): void {
  const result = detectPrimaryCycle(existing, proposed);
  if (result.cyclic) {
    throw new DomainError(
      'PRIMARY_CYCLE',
      `Primary reporting cycle detected: ${result.path.join(' → ')}`,
    );
  }
}
