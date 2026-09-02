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

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  displayName: 'Name',
  firstName: 'First name',
  lastName: 'Last name',
  title: 'Job title',
  email: 'Email',
  managerName: 'Manager',
  managerEmail: 'Manager email',
  department: 'Department',
  location: 'Location',
  employeeId: 'Employee ID',
};

const ALIASES: Record<ImportField, string[]> = {
  email: [
    'email',
    'work email',
    'e mail',
    'workemail',
    'mail',
    'email address',
    'work e mail',
    'work email address',
    'userprincipalname',
    'upn',
    'corporate email',
    'company email',
  ],
  displayName: [
    'name',
    'person',
    'display name',
    'full name',
    'fullname',
    'employee',
    'employee name',
    'employee full name',
    'legal name',
    'preferred name',
    'person name',
    'worker',
    'worker name',
    'colleague',
    'staff name',
    'staff',
  ],
  firstName: ['first name', 'firstname', 'first', 'given name', 'given', 'forename'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name', 'family'],
  title: [
    'title',
    'job title',
    'position',
    'role',
    'job',
    'job role',
    'position title',
    'business title',
    'role title',
    'designation',
    'job position',
  ],
  department: [
    'department',
    'dept',
    'team',
    'business unit',
    'function',
    'department name',
    'org unit',
    'organisation unit',
    'division',
  ],
  location: [
    'location',
    'office',
    'site',
    'city',
    'office location',
    'work location',
    'location name',
    'office name',
    'country',
  ],
  managerEmail: [
    'manager email',
    'manageremail',
    'reports to email',
    'line manager email',
    'supervisor email',
    'manager email address',
  ],
  managerName: [
    'manager',
    'manager name',
    'reports to',
    'line manager',
    'supervisor',
    'reports to name',
    'manager full name',
    'direct manager',
    'reporting manager',
    'manager supervisor',
  ],
  employeeId: [
    'employee id',
    'employeeid',
    'staff id',
    'id',
    'worker id',
    'employee number',
    'staff number',
    'employee no',
  ],
};

export function normaliseHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[_/\-.]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestColumnMap(headers: string[]): Record<ImportField, string | null> {
  const unused = new Map<string, string>();
  for (const header of headers) {
    const key = normaliseHeader(header);
    if (key && !unused.has(key)) unused.set(key, header);
  }
  const map = {} as Record<ImportField, string | null>;
  for (const field of IMPORT_FIELDS) {
    const match = ALIASES[field].map((alias) => unused.get(alias)).find(Boolean);
    if (match) {
      map[field] = match;
      unused.delete(normaliseHeader(match));
    } else {
      map[field] = null;
    }
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

export function resolveColumnMap(
  headers: string[],
  override?: unknown,
): Record<ImportField, string | null> {
  const suggested = suggestColumnMap(headers);
  if (!override || typeof override !== 'object') return suggested;
  const headerSet = new Set(headers);
  const next = { ...suggested };
  for (const field of IMPORT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(override, field)) continue;
    const value = (override as Record<string, unknown>)[field];
    if (value == null || value === '') {
      next[field] = null;
    } else if (typeof value === 'string' && headerSet.has(value)) {
      next[field] = value;
    }
  }
  return next;
}
