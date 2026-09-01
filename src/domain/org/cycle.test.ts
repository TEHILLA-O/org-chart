import { describe, expect, it } from 'vitest';
import { assertAcyclicPrimaryGraph, detectPrimaryCycle, DomainError } from './cycle';

describe('detectPrimaryCycle', () => {
  it('accepts a forest of primary edges', () => {
    const result = detectPrimaryCycle([
      { subordinatePositionId: 'cfo', managerPositionId: 'ceo' },
      { subordinatePositionId: 'cto', managerPositionId: 'ceo' },
      { subordinatePositionId: 'eng-mgr', managerPositionId: 'cto' },
    ]);
    expect(result.cyclic).toBe(false);
  });

  it('rejects self-reporting', () => {
    expect(() =>
      detectPrimaryCycle([], { subordinatePositionId: 'ceo', managerPositionId: 'ceo' }),
    ).toThrow(DomainError);
  });

  it('detects a cycle introduced by reparenting', () => {
    const existing = [
      { subordinatePositionId: 'b', managerPositionId: 'a' },
      { subordinatePositionId: 'c', managerPositionId: 'b' },
    ];
    const result = detectPrimaryCycle(existing, {
      subordinatePositionId: 'a',
      managerPositionId: 'c',
    });
    expect(result.cyclic).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('treats reparent as replacing the previous primary manager', () => {
    const existing = [{ subordinatePositionId: 'b', managerPositionId: 'a' }];
    const result = detectPrimaryCycle(existing, {
      subordinatePositionId: 'b',
      managerPositionId: 'c',
    });
    expect(result.cyclic).toBe(false);
  });

  it('assertAcyclicPrimaryGraph throws a coded domain error', () => {
    expect(() =>
      assertAcyclicPrimaryGraph(
        [{ subordinatePositionId: 'b', managerPositionId: 'a' }],
        { subordinatePositionId: 'a', managerPositionId: 'b' },
      ),
    ).toThrowError(/Primary reporting cycle/);
  });
});
