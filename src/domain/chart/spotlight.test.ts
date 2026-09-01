import { describe, expect, it } from 'vitest';
import { reportingLineageIds } from './spotlight';

describe('reportingLineageIds', () => {
  it('includes ancestors and descendants, not siblings', () => {
    const ids = reportingLineageIds(
      [
        { id: 'a', source: 'ceo', target: 'cto', kind: 'PRIMARY' },
        { id: 'b', source: 'ceo', target: 'cfo', kind: 'PRIMARY' },
        { id: 'c', source: 'cto', target: 'eng', kind: 'PRIMARY' },
      ],
      'cto',
    );
    expect([...ids].sort()).toEqual(['ceo', 'cto', 'eng']);
  });
});
