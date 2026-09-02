import type { ExternalPerson } from '../types';

interface RipplingName {
  display_name?: string;
  given_name?: string;
  family_name?: string;
  preferred_given_name?: string;
  preferred_family_name?: string;
}

interface RipplingUser {
  name?: RipplingName;
}

interface RipplingNamed {
  id?: string;
  name?: string;
  label?: string;
}

export interface RipplingWorker {
  id?: string;
  user_id?: string;
  status?: string;
  work_email?: string;
  first_name?: string;
  last_name?: string;
  preferred_first_name?: string;
  title?: string | RipplingNamed;
  department?: RipplingNamed;
  work_location?: RipplingNamed;
  location?: RipplingNamed;
  manager_id?: string;
  manager?: RipplingNamed;
  start_date?: string;
  employment_type?: RipplingNamed;
  user?: RipplingUser;
}

function named(value: string | RipplingNamed | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  return value.name?.trim() || value.label?.trim() || undefined;
}

export function mapRipplingWorker(worker: RipplingWorker): ExternalPerson | null {
  const externalId = String(worker.id ?? worker.user_id ?? '').trim();
  if (!externalId) return null;
  if (worker.status === 'TERMINATED') return null;

  const name = worker.user?.name ?? {};
  const firstName =
    name.preferred_given_name || name.given_name || worker.preferred_first_name || worker.first_name || '';
  const lastName = name.preferred_family_name || name.family_name || worker.last_name || '';
  const displayName =
    name.display_name?.trim() ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    worker.work_email ||
    'Rippling worker';

  return {
    externalId,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    displayName,
    email: worker.work_email || undefined,
    jobTitle: named(worker.title),
    department: named(worker.department),
    officeLocation: named(worker.work_location) || named(worker.location),
    managerExternalId: worker.manager_id || worker.manager?.id || undefined,
    startDate: worker.start_date,
    employmentType: named(worker.employment_type),
  };
}
