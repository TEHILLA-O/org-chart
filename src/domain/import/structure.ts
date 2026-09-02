import type { ImportField } from './columns';
import { importPersonLabel } from './validate';

export interface ImportFinding {
  severity: 'error' | 'warning' | 'info';
  kind: 'duplicate' | 'error' | 'manager' | 'structure' | 'data';
  rowNumber?: number;
  message: string;
}

export function fileStructureFindings(
  rows: Array<{ rowNumber: number; values: Record<ImportField, string>; status: string; errors: string[] }>,
): ImportFinding[] {
  const findings: ImportFinding[] = [];
  const names = new Map<string, number[]>();
  for (const row of rows) {
    const label = importPersonLabel(row.values);
    if (label) {
      const key = label.toLowerCase();
      const list = names.get(key) ?? [];
      list.push(row.rowNumber);
      names.set(key, list);
    }
    for (const message of row.errors) {
      findings.push({
        severity: 'error',
        kind: message.startsWith('Duplicate') ? 'duplicate' : 'error',
        rowNumber: row.rowNumber,
        message,
      });
    }
  }

  for (const [, rowNumbers] of names) {
    if (rowNumbers.length < 2) continue;
    const first = rows.find((row) => row.rowNumber === rowNumbers[0]);
    const label = first ? importPersonLabel(first.values) : 'this name';
    findings.push({
      severity: 'warning',
      kind: 'duplicate',
      rowNumber: rowNumbers[1],
      message: `Duplicate name “${label}” on rows ${rowNumbers.join(', ')}. Confirm they are different people before applying.`,
    });
  }

  const edges: Array<{ from: string; to: string; rowNumber: number }> = [];
  for (const row of rows) {
    const label = importPersonLabel(row.values);
    const manager = row.values.managerName.trim();
    if (!label || !manager) continue;
    if (names.has(manager.toLowerCase())) {
      edges.push({ from: label.toLowerCase(), to: manager.toLowerCase(), rowNumber: row.rowNumber });
    }
  }

  const visiting = new Set<string>();
  const seen = new Set<string>();
  const byFrom = new Map<string, string>();
  for (const edge of edges) byFrom.set(edge.from, edge.to);
  const walk = (node: string, path: string[]) => {
    if (seen.has(node)) return;
    if (visiting.has(node)) {
      findings.push({
        severity: 'error',
        kind: 'structure',
        message: `Circular reporting in the file: ${[...path, node].join(' → ')}.`,
      });
      return;
    }
    visiting.add(node);
    const next = byFrom.get(node);
    if (next) walk(next, [...path, node]);
    visiting.delete(node);
    seen.add(node);
  };
  for (const edge of edges) walk(edge.from, []);

  const roots = rows.filter((row) => !row.values.managerName.trim() && !row.values.managerEmail.trim());
  if (rows.length > 1 && roots.length === 0) {
    findings.push({
      severity: 'warning',
      kind: 'structure',
      message: 'No top-of-chart row (empty manager). The import may create several disconnected trees.',
    });
  }
  if (roots.length > 3) {
    findings.push({
      severity: 'warning',
      kind: 'structure',
      message: `${roots.length} rows have no manager. Confirm whether the file should have one organisation head.`,
    });
  }

  return findings;
}
