import { applyColumnMap, type ImportField } from './columns';

export interface ImportIssue {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface MappedImportRow {
  rowNumber: number;
  values: Record<ImportField, string>;
  status: 'NEW' | 'INVALID' | 'DUPLICATE';
  errors: string[];
}

export function mapImportRows(
  rawRows: Array<{ rowNumber: number; raw: Record<string, string> }>,
  columnMap: Record<string, string | null>,
): { rows: MappedImportRow[]; issues: ImportIssue[] } {
  const seenEmail = new Map<string, number>();
  const rows: MappedImportRow[] = [];
  const issues: ImportIssue[] = [];

  for (const item of rawRows) {
    const values = applyColumnMap(item.raw, columnMap);
    const errors: string[] = [];
    const hasName =
      Boolean(values.displayName) || (Boolean(values.firstName) && Boolean(values.lastName));
    if (!hasName && !values.email) {
      errors.push('Need a name or an email.');
    }
    if (!values.title) {
      errors.push('Job title is required so a seat can be created.');
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.push('Email is not valid.');
    }
    if (values.email) {
      const previous = seenEmail.get(values.email.toLowerCase());
      if (previous) {
        errors.push(`Duplicate email of row ${previous}.`);
      } else {
        seenEmail.set(values.email.toLowerCase(), item.rowNumber);
      }
    }

    const status = errors.length ? (errors.some((msg) => msg.startsWith('Duplicate')) ? 'DUPLICATE' : 'INVALID') : 'NEW';
    if (errors.length) {
      for (const message of errors) {
        issues.push({ rowNumber: item.rowNumber, message });
      }
    }
    rows.push({ rowNumber: item.rowNumber, values, status, errors });
  }

  return { rows, issues };
}
