import type { ConnectorAdapter, ConnectorMetadata } from '../types';

export const MICROSOFT_GRAPH_METADATA: ConnectorMetadata = {
  provider: 'MICROSOFT_GRAPH',
  displayName: 'Microsoft 365',
  authScheme: 'OAUTH2_OIDC',
  readOnly: true,
  supportsIncremental: true,
  entities: ['people', 'positions', 'departments', 'locations', 'relationships', 'photos'],
};

/**
 * Real Graph adapter. Instantiation is refused without tenant credentials so
 * local development never silently talks to Microsoft.
 */
export function createMicrosoftGraphConnector(credentials?: {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}): ConnectorAdapter {
  if (!credentials?.clientId || !credentials.clientSecret || !credentials.tenantId) {
    throw new Error(
      'REAL_MICROSOFT_CONNECTOR requires AUTH_MICROSOFT_ENTRA_ID_ID, SECRET and TENANT_ID. See docs/MICROSOFT_SETUP.md.',
    );
  }

  return {
    getMetadata: () => MICROSOFT_GRAPH_METADATA,
    testConnection: async () => ({
      ok: false,
      message: 'Graph pull is wired but not executed until Phase 2 sync engine lands.',
    }),
    authenticate: async () => ({ ok: false }),
    async *pullPeople() {
      throw new Error('Microsoft Graph pull is implemented in Phase 2.');
    },
    async *pullPositions() {
      throw new Error('Microsoft Graph pull is implemented in Phase 2.');
    },
    async *pullDepartments() {},
    async *pullLocations() {},
    async *pullRelationships() {},
    async *pullPhotos() {},
    async *getChanges() {},
  };
}
