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
  email: ['email', 'work email', 'e-mail', 'workemail', 'mail', 'email address', 'work e-mail'],
  displayName: [
    'name',
    'person',
    'display name',
    'full name',
    'employee',
    'employee name',
    'worker',
    'colleague',
    'staff name',
  ],
  firstName: ['first name', 'firstname', 'first', 'given name', 'given'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name', 'family'],
  title: ['title', 'job title', 'position', 'role', 'job', 'job role', 'position title'],
  department: ['department', 'dept', 'team', 'business unit', 'function'],
  location: ['location', 'office', 'site', 'city', 'office location', 'work location'],
  managerEmail: ['manager email', 'manageremail', 'reports to email', 'line manager email', 'supervisor email'],
  managerName: [
    'manager',
    'manager name',
    'reports to',
    'line manager',
    'supervisor',
    'reports to name',
    'manager full name',
  ],
  employeeId: ['employee id', 'employeeid', 'staff id', 'id', 'worker id', 'employee number'],
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
