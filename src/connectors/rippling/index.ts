import type { ConnectorAdapter, ConnectorMetadata, ExternalPerson } from '../types';

export const RIPPLING_METADATA: ConnectorMetadata = {
  provider: 'RIPPLING',
  displayName: 'Rippling',
  authScheme: 'API_KEY',
  readOnly: true,
  supportsIncremental: true,
  entities: ['people', 'departments', 'locations'],
};

/**
 * Read-only Rippling REST adapter (https://rest.ripplingapis.com).
 * Instantiation is refused without an API token so local dev never talks to Rippling by accident.
 */
export function createRipplingConnector(credentials?: {
  apiToken?: string;
  baseUrl?: string;
}): ConnectorAdapter {
  const token = credentials?.apiToken?.trim();
  const baseUrl = (credentials?.baseUrl ?? 'https://rest.ripplingapis.com').replace(/\/$/, '');
  if (!token) {
    throw new Error(
      'REAL_RIPPLING_CONNECTOR requires RIPPLING_API_TOKEN. Leave RIPPLING_CONNECTOR_MODE=mock for local development.',
    );
  }

  async function ripplingGet(path: string): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        'user-agent': 'OrgPulse/0.1',
      },
    });
  }

  return {
    getMetadata: () => RIPPLING_METADATA,
    testConnection: async () => {
      const response = await ripplingGet('/workers?limit=1');
      if (!response.ok) {
        return {
          ok: false,
          message: `Rippling returned ${response.status}. Check the API token and workers:read scope.`,
        };
      }
      return { ok: true, message: 'Rippling REST API accepted the token.' };
    },
    authenticate: async () => ({ ok: true }),
    async *pullPeople() {
      let next: string | null = `${baseUrl}/workers?limit=100`;
      while (next) {
        const response = await fetch(next, {
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/json',
            'user-agent': 'OrgPulse/0.1',
          },
        });
        if (!response.ok) {
          throw new Error(`Rippling workers pull failed (${response.status}).`);
        }
        const body = (await response.json()) as {
          results?: Array<{
            id?: string;
            user_id?: string;
            first_name?: string;
            last_name?: string;
            preferred_first_name?: string;
            work_email?: string;
            title?: { name?: string };
            department?: { name?: string };
            work_location?: { name?: string };
            manager?: { id?: string };
            start_date?: string;
          }>;
          next_link?: string | null;
        };
        for (const worker of body.results ?? []) {
          const person: ExternalPerson = {
            externalId: String(worker.id ?? worker.user_id ?? ''),
            firstName: worker.first_name,
            lastName: worker.last_name,
            displayName:
              [worker.preferred_first_name ?? worker.first_name, worker.last_name].filter(Boolean).join(' ') ||
              worker.work_email ||
              'Rippling worker',
            email: worker.work_email,
            jobTitle: worker.title?.name,
            department: worker.department?.name,
            officeLocation: worker.work_location?.name,
            managerExternalId: worker.manager?.id,
            startDate: worker.start_date,
          };
          if (person.externalId) yield person;
        }
        next = body.next_link ?? null;
      }
    },
    async *pullPositions() {},
    async *pullDepartments() {},
    async *pullLocations() {},
    async *pullRelationships() {},
    async *pullPhotos() {},
    async *getChanges() {},
  };
}
