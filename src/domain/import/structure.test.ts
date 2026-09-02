import { describe, expect, it } from 'vitest';
import { fileStructureFindings } from './structure';

describe('fileStructureFindings', () => {
  it('flags a reporting cycle', () => {
    const findings = fileStructureFindings([
      {
        rowNumber: 2,
        status: 'NEW',
        errors: [],
        values: {
          email: '',
          displayName: 'Ada',
          firstName: '',
          lastName: '',
          title: 'A',
          department: '',
          location: '',
          managerEmail: '',
          managerName: 'Ben',
          employeeId: '',
        },
      },
      {
        rowNumber: 3,
        status: 'NEW',
        errors: [],
        values: {
          email: '',
          displayName: 'Ben',
          firstName: '',
          lastName: '',
          title: 'B',
          department: '',
          location: '',
          managerEmail: '',
          managerName: 'Ada',
          employeeId: '',
        },
      },
    ]);
    expect(findings.some((finding) => finding.kind === 'structure' && finding.message.includes('Circular'))).toBe(
      true,
    );
  });

  it('warns on duplicate names in the file', () => {
    const blank = {
      email: '',
      firstName: '',
      lastName: '',
      department: '',
      location: '',
      managerEmail: '',
      managerName: '',
      employeeId: '',
    };
    const findings = fileStructureFindings([
      {
        rowNumber: 2,
        status: 'NEW',
        errors: [],
        values: { ...blank, displayName: 'Ada Lovelace', title: 'Analyst' },
      },
      {
        rowNumber: 3,
        status: 'NEW',
        errors: [],
        values: { ...blank, displayName: 'Ada Lovelace', title: 'Lead', managerName: 'Ben' },
      },
    ]);
    expect(findings.some((finding) => finding.kind === 'duplicate' && finding.message.includes('Ada Lovelace'))).toBe(
      true,
    );
  });
});
