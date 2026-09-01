import type { ConnectorAdapter, ConnectorMetadata } from '../types';

export const MOCK_MICROSOFT_METADATA: ConnectorMetadata = {
  provider: 'MICROSOFT_MOCK',
  displayName: 'Microsoft 365 (mock)',
  authScheme: 'NONE',
  readOnly: true,
  supportsIncremental: true,
  entities: ['people', 'positions', 'departments', 'locations', 'relationships', 'photos'],
};

export function createMockMicrosoftConnector(): ConnectorAdapter {
  return {
    getMetadata: () => MOCK_MICROSOFT_METADATA,
    testConnection: async () => ({ ok: true, message: 'Mock connector is always reachable.' }),
    authenticate: async () => ({ ok: true }),
    async *pullPeople() {},
    async *pullPositions() {},
    async *pullDepartments() {},
    async *pullLocations() {},
    async *pullRelationships() {},
    async *pullPhotos() {},
    async *getChanges() {},
  };
}
