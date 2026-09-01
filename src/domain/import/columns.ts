export const IMPORT_FIELDS = [
  'email',
  'displayName',
  'firstName',
  'lastName',
  'title',
  'department',
  'location',
  'managerEmail',
  'managerName',
  'employeeId',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

const ALIASES: Record<ImportField, string[]> = {
  email: ['email', 'work email', 'e-mail', 'workemail'],
  displayName: ['name', 'person', 'display name', 'full name', 'employee'],
  firstName: ['first name', 'firstname', 'first', 'given name'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name'],
  title: ['title', 'job title', 'position', 'role'],
  department: ['department', 'dept', 'team'],
  location: ['location', 'office', 'site', 'city'],
  managerEmail: ['manager email', 'manageremail', 'reports to email', 'line manager email'],
  managerName: ['manager', 'manager name', 'reports to', 'line manager'],
  employeeId: ['employee id', 'employeeid', 'staff id', 'id'],
};

export function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

export function suggestColumnMap(headers: string[]): Record<ImportField, string | null> {
  const available = new Map(headers.map((header) => [normaliseHeader(header), header]));
  const map = {} as Record<ImportField, string | null>;
  for (const field of IMPORT_FIELDS) {
    const match = ALIASES[field].map((alias) => available.get(alias)).find(Boolean);
    map[field] = match ?? null;
  }
  return map;
}

export function applyColumnMap(
  row: Record<string, string>,
  columnMap: Record<string, string | null>,
): Record<ImportField, string> {
  const result = {} as Record<ImportField, string>;
  for (const field of IMPORT_FIELDS) {
    const source = columnMap[field];
    result[field] = source ? (row[source] ?? '').trim() : '';
  }
  return result;
}
