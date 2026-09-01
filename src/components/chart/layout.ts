import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import type { ChartEdgeModel, ChartNodeModel } from '@/domain/chart/project';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 156;

export type LayoutDirection = 'TOP_DOWN' | 'LEFT_RIGHT';

export async function layoutChart(
  models: ChartNodeModel[],
  edgeModels: ChartEdgeModel[],
  direction: LayoutDirection,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elk = new ELK();
  const primary = edgeModels.filter((edge) => edge.kind === 'PRIMARY');
  const horizontal = direction === 'LEFT_RIGHT';

  const laid = await elk.layout({
    id: 'org',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': horizontal ? 'RIGHT' : 'DOWN',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '88',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: models.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: primary.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const positions = new Map(
    (laid.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]),
  );

  const nodes: Node[] = models.map((model) => ({
    id: model.id,
    type: 'position',
    position: positions.get(model.id) ?? { x: 0, y: 0 },
    data: { ...model, layoutDirection: direction },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    draggable: true,
  }));

  const edges: Edge[] = edgeModels.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.kind !== 'PRIMARY',
    style:
      edge.kind === 'PRIMARY'
        ? { stroke: '#c9c3b8', strokeWidth: 1.4 }
        : { stroke: '#c08a62', strokeWidth: 1.3, strokeDasharray: '5 4' },
  }));

  return { nodes, edges };
}
