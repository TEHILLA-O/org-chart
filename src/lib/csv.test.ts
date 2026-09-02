import { describe, expect, it } from 'vitest';
import { csvEscape, decodeSpreadsheetBytes, parseCsv, sanitiseSpreadsheetText, toCsv } from './csv';

describe('csvEscape', () => {
  it('leaves ordinary text unquoted', () => {
    expect(csvEscape('Amelia Shah')).toBe('Amelia Shah');
  });

  it('quotes commas and doubles internal quotes', () => {
    expect(csvEscape('Shah, Amelia "CEO"')).toBe('"Shah, Amelia ""CEO"""');
  });

  it('neutralises formula injection', () => {
    expect(csvEscape('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvEscape('+cmd')).toBe('"\'+cmd"');
    expect(csvEscape('-2+3')).toBe('"\'-2+3"');
    expect(csvEscape('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });
});

describe('toCsv', () => {
  it('emits a BOM and CRLF rows', () => {
    const csv = toCsv(['Name', 'Title'], [['Noah', 'CTO']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Name,Title');
    expect(csv).toContain('Noah,CTO');
  });
});

describe('parseCsv', () => {
  it('reads a BOM and semicolon Excel export', () => {
    const parsed = parseCsv('\uFEFFPerson;Title;Manager\nSam Imported;Analyst;Amelia Shah\n');
    expect(parsed.headers).toEqual(['Person', 'Title', 'Manager']);
    expect(parsed.rows[0]?.Person).toBe('Sam Imported');
    expect(parsed.rows[0]?.Title).toBe('Analyst');
  });

  it('decodes UTF-16 LE Excel unicode text', () => {
    const text = 'Name,Title\nAda,CTO';
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      bytes[2 + index * 2] = code & 0xff;
      bytes[3 + index * 2] = code >> 8;
    }
    const parsed = parseCsv(decodeSpreadsheetBytes(bytes));
    expect(parsed.headers).toEqual(['Name', 'Title']);
    expect(parsed.rows[0]?.Name).toBe('Ada');
  });
});

describe('sanitiseSpreadsheetText', () => {
  it('prefixes formula-like values for XLSX cells', () => {
    expect(sanitiseSpreadsheetText('=1+1')).toBe("'=1+1");
    expect(sanitiseSpreadsheetText('Analyst')).toBe('Analyst');
  });
});
