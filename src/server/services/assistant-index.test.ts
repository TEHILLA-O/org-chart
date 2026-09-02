import { describe, expect, it } from 'vitest';
import { matchSeats, requireOneSeat, type AssistantSeat } from './assistant-index';

const seats: AssistantSeat[] = [
  {
    personId: 'p1',
    positionId: 's1',
    displayName: 'Amelia Shah',
    title: 'Chief Executive Officer',
    department: null,
    managerName: null,
    managerPositionId: null,
    reportCount: 4,
    vacant: false,
  },
  {
    personId: 'p2',
    positionId: 's2',
    displayName: 'Sam Imported',
    title: 'Analyst',
    department: 'Finance',
    managerName: 'Amelia Shah',
    managerPositionId: 's1',
    reportCount: 0,
    vacant: false,
  },
  {
    personId: 'p3',
    positionId: 's3',
    displayName: 'Sam Rivera',
    title: 'Designer',
    department: 'Product',
    managerName: 'Amelia Shah',
    managerPositionId: 's1',
    reportCount: 0,
    vacant: false,
  },
];

describe('matchSeats', () => {
  it('returns an exact unique name', () => {
    expect(requireOneSeat(seats, 'Amelia Shah', 'person').ok).toBe(true);
  });

  it('asks for a more specific name when two Sams match', () => {
    const result = requireOneSeat(seats, 'Sam', 'person');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Several');
  });

  it('matches a unique fragment', () => {
    const matches = matchSeats(seats, 'imported');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.displayName).toBe('Sam Imported');
  });
});
