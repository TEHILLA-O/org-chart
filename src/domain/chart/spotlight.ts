import type { ChartEdgeModel } from './project';

/** Ancestors and descendants of a seat on the primary reporting line. */
export function reportingLineageIds(
  edges: readonly ChartEdgeModel[],
  selectedId: string,
): Set<string> {
  const ids = new Set<string>([selectedId]);
  const primary = edges.filter((edge) => edge.kind === 'PRIMARY');

  let current: string | undefined = selectedId;
  while (current) {
    const parent = primary.find((edge) => edge.target === current);
    if (!parent) break;
    ids.add(parent.source);
    current = parent.source;
  }

  const queue = [selectedId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const edge of primary) {
      if (edge.source !== id || ids.has(edge.target)) continue;
      ids.add(edge.target);
      queue.push(edge.target);
    }
  }

  return ids;
}
