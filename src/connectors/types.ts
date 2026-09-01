/**
 * Vendor-agnostic connector contract.
 * Implementations live under src/connectors/<adapter>/ — nowhere else.
 */
export interface ConnectorMetadata {
  provider: string;
  displayName: string;
  authScheme: 'OAUTH2_OIDC' | 'API_KEY' | 'NONE';
  readOnly: boolean;
  supportsIncremental: boolean;
  entities: Array<'people' | 'positions' | 'departments' | 'locations' | 'relationships' | 'photos'>;
}

export interface ConnectorConfig {
  organisationId: string;
  credentials?: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface AuthResult {
  ok: boolean;
  expiresAt?: Date;
}

export interface PullContext {
  organisationId: string;
  cursor?: string | null;
  correlationId: string;
}

export interface ExternalPerson {
  externalId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  managerExternalId?: string;
  sourceModifiedAt?: Date;
  leaveRemainingDays?: number;
  leaveAllowanceDays?: number;
  costCentre?: string;
  startDate?: string;
  employmentType?: string;
  skills?: string[];
}

export interface ExternalPosition {
  externalId: string;
  title: string;
  department?: string;
  location?: string;
}

export interface ExternalDepartment {
  externalId: string;
  name: string;
  code?: string;
}

export interface ExternalLocation {
  externalId: string;
  name: string;
  city?: string;
  country?: string;
}

export interface ExternalRelationship {
  externalId: string;
  subordinateExternalId: string;
  managerExternalId: string;
  type: 'PRIMARY' | 'SECONDARY' | 'DOTTED_LINE';
}

export interface ExternalPhoto {
  externalId: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface ExternalChange {
  externalId: string;
  entityType: string;
  removed?: boolean;
}

export interface ConnectorAdapter {
  getMetadata(): ConnectorMetadata;
  testConnection(cfg: ConnectorConfig): Promise<ConnectionTestResult>;
  authenticate(cfg: ConnectorConfig): Promise<AuthResult>;
  pullPeople(ctx: PullContext): AsyncIterable<ExternalPerson>;
  pullPositions(ctx: PullContext): AsyncIterable<ExternalPosition>;
  pullDepartments(ctx: PullContext): AsyncIterable<ExternalDepartment>;
  pullLocations(ctx: PullContext): AsyncIterable<ExternalLocation>;
  pullRelationships(ctx: PullContext): AsyncIterable<ExternalRelationship>;
  pullPhotos(ctx: PullContext): AsyncIterable<ExternalPhoto>;
  getChanges(ctx: PullContext, cursor: string | null): AsyncIterable<ExternalChange>;
}
