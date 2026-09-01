import { can, type Actor, type OrgRole } from '../permissions/policy';

export type FieldVisibility = 'PUBLIC' | 'INTERNAL' | 'ADMIN_ONLY';

export interface FieldPolicy {
  key: string;
  visibility: FieldVisibility;
  isPrivate?: boolean;
}

export interface RedactionContext {
  actor: Actor | null;
  isShareLink?: boolean;
  allowedFields?: readonly string[];
}

const PERSON_FIELDS: Record<string, FieldVisibility> = {
  id: 'PUBLIC',
  displayName: 'PUBLIC',
  preferredName: 'PUBLIC',
  firstName: 'PUBLIC',
  lastName: 'PUBLIC',
  profilePhotoUrl: 'PUBLIC',
  title: 'PUBLIC',
  department: 'PUBLIC',
  location: 'PUBLIC',
  status: 'INTERNAL',
  email: 'INTERNAL',
  phone: 'INTERNAL',
  startDate: 'INTERNAL',
  endDate: 'INTERNAL',
  employeeId: 'INTERNAL',
  holidayAllowanceDays: 'INTERNAL',
  holidayRemainingDays: 'INTERNAL',
  costCentre: 'INTERNAL',
  workingPattern: 'INTERNAL',
  ftePercent: 'INTERNAL',
  nextReviewDate: 'INTERNAL',
  probationEndDate: 'INTERNAL',
  contractEndDate: 'INTERNAL',
  noticePeriodDays: 'INTERNAL',
  tenure: 'INTERNAL',
  employmentType: 'INTERNAL',
  allocationPercentage: 'INTERNAL',
};

export function isFieldVisible(
  field: FieldPolicy | string,
  ctx: RedactionContext,
): boolean {
  const policy: FieldPolicy =
    typeof field === 'string'
      ? { key: field, visibility: PERSON_FIELDS[field] ?? 'INTERNAL' }
      : field;

  if (policy.isPrivate && ctx.isShareLink) {
    return false;
  }

  if (ctx.isShareLink) {
    if (policy.visibility === 'ADMIN_ONLY') return false;
    if (policy.isPrivate) return false;
    if (ctx.allowedFields && ctx.allowedFields.length > 0) {
      return ctx.allowedFields.includes(policy.key);
    }
    return policy.visibility === 'PUBLIC';
  }

  if (policy.visibility === 'ADMIN_ONLY') {
    return can(ctx.actor, 'fields:admin-only:read');
  }

  return ctx.actor !== null;
}

export function redactRecord<T extends Record<string, unknown>>(
  record: T,
  ctx: RedactionContext,
  extraPolicies: FieldPolicy[] = [],
): Partial<T> {
  const extras = new Map(extraPolicies.map((policy) => [policy.key, policy]));
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(record)) {
    const policy = extras.get(key) ?? { key, visibility: PERSON_FIELDS[key] ?? 'INTERNAL' };
    if (isFieldVisible(policy, ctx)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

export function roleForVisibility(visibility: FieldVisibility): OrgRole | null {
  if (visibility === 'ADMIN_ONLY') return 'ADMIN';
  return 'VIEWER';
}
