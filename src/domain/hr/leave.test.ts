import { describe, expect, it } from 'vitest';
import { mockHolidayBalance, tenureLabel } from './leave';

describe('mockHolidayBalance', () => {
  it('is deterministic and never exceeds the allowance', () => {
    const first = mockHolidayBalance('NST-0001');
    const second = mockHolidayBalance('NST-0001');
    expect(first).toEqual(second);
    expect(first.remainingDays).toBeLessThanOrEqual(first.allowanceDays);
    expect(first.remainingDays).toBeGreaterThanOrEqual(0);
  });
});

describe('tenureLabel', () => {
  it('formats years and months', () => {
    expect(tenureLabel(new Date('2024-03-01T00:00:00Z'), new Date('2026-09-01T00:00:00Z'))).toBe(
      '2y 6m',
    );
  });
});
