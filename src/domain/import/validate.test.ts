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
});
