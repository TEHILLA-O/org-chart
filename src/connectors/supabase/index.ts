import type { ConnectorAdapter, ConnectorConfig, ConnectorMetadata, ExternalPerson } from '../types';

export const SUPABASE_METADATA: ConnectorMetadata = {
  provider: 'SUPABASE',
  displayName: 'Supabase directory',
  authScheme: 'API_KEY',
  readOnly: true,
  supportsIncremental: false,
  entities: ['people'],
};

const MOCK_PEOPLE: ExternalPerson[] = [
  {
    externalId: 'sb-pat',
    displayName: 'Pat Newhire',
    firstName: 'Pat',
    lastName: 'Newhire',
    email: 'pat.directory@northstar.example',
    jobTitle: 'Analyst',
    department: 'Finance',
    officeLocation: 'London',
  },
  {
    externalId: 'sb-renee',
    displayName: 'Renee Cole',
    firstName: 'Renee',
    lastName: 'Cole',
    email: 'renee.directory@northstar.example',
    jobTitle: 'People partner',
    department: 'People',
    officeLocation: 'London',
  },
];

function settings(cfg: ConnectorConfig) {
  return (cfg.settings ?? {}) as {
    url?: string;
    table?: string;
    anonKey?: string;
    serviceKey?: string;
  };
}

export function createSupabaseConnector(options?: { url?: string; apiKey?: string }): ConnectorAdapter {
  return {
    getMetadata: () => SUPABASE_METADATA,
    testConnection: async (cfg) => {
      const stored = settings(cfg);
      const url = stored.url || options?.url;
      const key = stored.serviceKey || stored.anonKey || options?.apiKey;
      if (!url || !key) {
        return {
          ok: true,
          message: 'No Supabase credentials yet — mock directory rows are used until you add a project URL and key.',
        };
      }
      try {
        const table = stored.table || 'people';
        const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
          headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
          },
        });
        if (!response.ok) {
          return { ok: false, message: `Supabase responded ${response.status}. Check the table name and key.` };
        }
        return { ok: true, message: 'Supabase directory is reachable.' };
      } catch {
        return { ok: false, message: 'Could not reach that Supabase URL.' };
      }
    },
    authenticate: async () => ({ ok: true }),
    async *pullPeople(ctx) {
      const stored = (ctx as unknown as { settings?: Record<string, unknown> }).settings ?? {};
      void stored;
      for (const person of MOCK_PEOPLE) {
        yield person;
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

export async function pullSupabasePeople(cfg: ConnectorConfig): Promise<ExternalPerson[]> {
  const stored = settings(cfg);
  const url = stored.url;
  const key = stored.serviceKey || stored.anonKey;
  if (!url || !key) {
    return MOCK_PEOPLE;
  }
  const table = stored.table || 'people';
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=*`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`Supabase read failed (${response.status}).`);
  }
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows.map((row, index) => ({
    externalId: String(row.id ?? row.email ?? `row-${index}`),
    displayName: String(row.display_name ?? row.name ?? row.full_name ?? 'Unknown'),
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    email: typeof row.email === 'string' ? row.email : undefined,
    jobTitle: typeof row.title === 'string' ? row.title : typeof row.job_title === 'string' ? row.job_title : undefined,
    department: typeof row.department === 'string' ? row.department : undefined,
    officeLocation: typeof row.location === 'string' ? row.location : undefined,
    skills: Array.isArray(row.skills)
      ? row.skills.map(String)
      : typeof row.skills === 'string'
        ? row.skills.split(',').map((value) => value.trim()).filter(Boolean)
        : undefined,
  }));
}
