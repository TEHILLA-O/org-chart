import { describe, expect, it } from 'vitest';
import { suggestColumnMap } from './columns';
import { mapImportRows } from './validate';

describe('suggestColumnMap', () => {
  it('matches export-style and HR-style headers', () => {
    const map = suggestColumnMap(['Person', 'Title', 'Department', 'Email', 'Manager', 'Location']);
    expect(map.displayName).toBe('Person');
    expect(map.title).toBe('Title');
    expect(map.email).toBe('Email');
    expect(map.managerName).toBe('Manager');
    expect(map.department).toBe('Department');
  });

  it('matches Employee Name headers', () => {
    const map = suggestColumnMap(['Employee Name', 'Job Title', 'Reports To']);
    expect(map.displayName).toBe('Employee Name');
    expect(map.title).toBe('Job Title');
    expect(map.managerName).toBe('Reports To');
  });

  it('matches legal-name style exports without reusing manager', () => {
    const map = suggestColumnMap(['Legal Name', 'Business Title', 'Manager Name', 'Work Email']);
    expect(map.displayName).toBe('Legal Name');
    expect(map.title).toBe('Business Title');
    expect(map.managerName).toBe('Manager Name');
    expect(map.email).toBe('Work Email');
  });
});

describe('mapImportRows', () => {
  it('flags missing title and duplicate emails', () => {
    const columnMap = suggestColumnMap(['Person', 'Title', 'Email']);
    const mapped = mapImportRows(
      [
        { rowNumber: 2, raw: { Email: 'a@x.com', Person: 'Ada', Title: 'Analyst' } },
        { rowNumber: 3, raw: { Email: 'a@x.com', Person: 'Ada 2', Title: 'Lead' } },
        { rowNumber: 4, raw: { Email: 'b@x.com', Person: 'Ben', Title: '' } },
      ],
      columnMap,
    );
    expect(mapped.rows[0]?.status).toBe('NEW');
    expect(mapped.rows[1]?.status).toBe('DUPLICATE');
    expect(mapped.rows[2]?.status).toBe('INVALID');
  });

  it('flags self-reporting as invalid', () => {
    const columnMap = suggestColumnMap(['Person', 'Title', 'Manager']);
    const mapped = mapImportRows(
      [
        { rowNumber: 2, raw: { Person: 'Ada Lovelace', Title: 'Analyst', Manager: '' } },
        { rowNumber: 3, raw: { Person: 'Ada Lovelace', Title: 'Lead', Manager: 'Ada Lovelace' } },
      ],
      columnMap,
    );
    expect(mapped.rows[1]?.status).toBe('INVALID');
    expect(mapped.rows[1]?.errors.some((msg) => msg.includes('themselves'))).toBe(true);
  });
});
