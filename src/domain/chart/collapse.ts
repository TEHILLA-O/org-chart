import { type ReportingGraph } from '../org/graph';

/**
 * Collapse prunes subtrees. Nodes under a collapsed branch are omitted from
 * the projected chart so React Flow never mounts them.
 */
export function applyCollapseState(
  graph: ReportingGraph,
  collapsedPositionIds: ReadonlySet<string>,
  visibleIds: ReadonlySet<string>,
): Set<string> {
  const rendered = new Set<string>();

  const walk = (id: string, ancestorCollapsed: boolean): void => {
    if (!visibleIds.has(id)) return;
    if (ancestorCollapsed) return;

    rendered.add(id);
    const collapsedHere = collapsedPositionIds.has(id);
    for (const child of graph.children.get(id) ?? []) {
      walk(child, collapsedHere);
    }
  };

  for (const root of graph.roots) {
    walk(root, false);
  }

  return rendered;
}

export function ancestorsToExpand(
  graph: ReportingGraph,
  positionId: string,
  collapsedPositionIds: ReadonlySet<string>,
): string[] {
  const toExpand: string[] = [];
  for (const ancestor of graph.ancestorIndex.get(positionId) ?? []) {
    if (collapsedPositionIds.has(ancestor)) {
      toExpand.push(ancestor);
    }
  }
  return toExpand;
}
