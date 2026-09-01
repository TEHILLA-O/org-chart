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
