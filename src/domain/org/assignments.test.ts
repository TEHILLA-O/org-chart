import { describe, expect, it } from 'vitest';
import { can } from '@/domain/permissions/policy';
import { assertAllocationCap, assertPrimaryAssignmentUniqueness } from '@/domain/org/assignments';
import { DomainError } from '@/domain/org/cycle';

describe('assignment invariants', () => {
  const base = {
    id: 'a',
    personId: 'p',
    positionId: 'pos',
    isPrimary: true,
    allocationPercentage: 80,
    assignmentType: 'PERMANENT',
    startDate: new Date('2020-01-01'),
    endDate: null,
  };

  it('rejects a second primary assignment', () => {
    expect(() =>
      assertPrimaryAssignmentUniqueness('p', [base], { ...base, id: 'b', positionId: 'pos-2' }),
    ).toThrow(DomainError);
  });

  it('rejects allocation over 100%', () => {
    expect(() =>
      assertAllocationCap('p', [base], { ...base, id: 'b', isPrimary: false, allocationPercentage: 30 }),
    ).toThrow(DomainError);
  });
});

describe('viewer cannot manage integrations', () => {
  it('is denied', () => {
    expect(
      can({ userId: 'u', organisationId: 'o', role: 'VIEWER' }, 'integrations:manage'),
    ).toBe(false);
  });
});
