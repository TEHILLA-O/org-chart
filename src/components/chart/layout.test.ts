import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { applyPinnedPositions, snapshotNodePositions } from './layout';

describe('chart positions', () => {
  it('keeps dragged coordinates when pins are applied', () => {
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 40, y: 40 } },
    ] as Node[];
    const next = applyPinnedPositions(nodes, { a: { x: 120, y: 80 } });
    expect(next[0]?.position).toEqual({ x: 120, y: 80 });
    expect(next[1]?.position).toEqual({ x: 40, y: 40 });
  });

  it('snapshots current node coordinates', () => {
    const nodes = [{ id: 'a', position: { x: 10, y: 20 } }] as Node[];
    expect(snapshotNodePositions(nodes)).toEqual({ a: { x: 10, y: 20 } });
  });
});
