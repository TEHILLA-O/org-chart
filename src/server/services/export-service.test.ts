import { describe, expect, it } from 'vitest';
import { directoryRowsFromNodes, directoryToCsv } from './export-service';
import type { ChartNodeModel } from '@/domain/chart/project';

function node(partial: Partial<ChartNodeModel> & Pick<ChartNodeModel, 'id' | 'title'>): ChartNodeModel {
  return {
    positionId: partial.id,
    departmentId: null,
    departmentName: 'Finance',
    departmentColour: '#2f6f6a',
    locationId: null,
    locationName: 'London',
    positionType: 'SINGLE',
    isVacant: false,
    isAssistant: false,
    hasSecondary: false,
    overloaded: false,
    managerName: 'Amelia Shah',
    managerTitle: 'CEO',
    directReportCount: 0,
    downstreamCount: 0,
    collapsed: false,
    occupants: [],
    groupIds: [],
    groupNames: [],
    ...partial,
  };
}

describe('directory export', () => {
  it('emits a vacant row and sanitises formula-like names', () => {
    const rows = directoryRowsFromNodes([
      node({
        id: 'vac',
        title: 'Analyst',
        isVacant: true,
      }),
      node({
        id: 'fin',
        title: 'Controller',
        occupants: [
          {
            personId: 'p1',
            displayName: '=cmd',
            preferredName: null,
            profilePhotoUrl: null,
            email: 'fin@northstar.example',
            isPrimary: true,
            status: 'ACTIVE',
            holidayRemainingDays: 12,
          },
        ],
      }),
    ]);
    expect(rows.some((row) => row.status === 'Vacant')).toBe(true);
    const csv = directoryToCsv(rows);
    expect(csv).toContain("'=cmd");
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });
});
