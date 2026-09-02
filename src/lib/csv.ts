import Papa from 'papaparse';

/** Prefix characters Excel/LibreOffice treat as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvEscape(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const guarded = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  const escaped = guarded.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped) || FORMULA_PREFIX.test(raw)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function sanitiseSpreadsheetText(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? '' : String(value);
  return FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
}

function parseWith(text: string, delimiter?: string) {
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    ...(delimiter ? { delimiter } : {}),
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  });
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const stripped = text.replace(/^\uFEFF/, '');
  let parsed = parseWith(stripped);
  const firstHeader = (parsed.meta.fields ?? [])[0] ?? '';
  if (firstHeader.includes(';') && !firstHeader.includes(',')) {
    parsed = parseWith(stripped, ';');
  } else if (firstHeader.includes('\t') && !firstHeader.includes(',')) {
    parsed = parseWith(stripped, '\t');
  }
  const headers = (parsed.meta.fields ?? []).map((header) => header.replace(/^\uFEFF/, '').trim()).filter(Boolean);
  const rows = (parsed.data ?? [])
    .map((row) => {
      const clean: Record<string, string> = {};
      for (const header of headers) {
        const value = row[header] ?? row[`\uFEFF${header}`];
        clean[header] = value == null ? '' : String(value).trim();
      }
      return clean;
    })
    .filter((row) => Object.values(row).some((value) => value.length > 0));
  return { headers, rows };
}
