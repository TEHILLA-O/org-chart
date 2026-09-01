import { mockHolidayBalance } from '@/domain/hr/leave';
import type { ConnectorAdapter, ConnectorMetadata, ExternalPerson } from '../types';

export const RIPPLING_MOCK_METADATA: ConnectorMetadata = {
  provider: 'RIPPLING',
  displayName: 'Rippling (mock)',
  authScheme: 'NONE',
  readOnly: true,
  supportsIncremental: true,
  entities: ['people', 'departments', 'locations'],
};

export function createMockRipplingConnector(people: ExternalPerson[] = []): ConnectorAdapter {
  return {
    getMetadata: () => RIPPLING_MOCK_METADATA,
    testConnection: async () => ({
      ok: true,
      message: 'Rippling mock is reachable. No tenant token required.',
    }),
    authenticate: async () => ({ ok: true }),
    async *pullPeople() {
      for (const person of people) {
        const leave = mockHolidayBalance(person.externalId);
        yield {
          ...person,
          leaveAllowanceDays: leave.allowanceDays,
          leaveRemainingDays: leave.remainingDays,
        };
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
