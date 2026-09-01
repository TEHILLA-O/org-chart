export type OrgRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type PermissionAction =
  | 'org:read'
  | 'org:write'
  | 'org:admin'
  | 'org:own'
  | 'people:read'
  | 'people:write'
  | 'positions:read'
  | 'positions:write'
  | 'relationships:write'
  | 'charts:read'
  | 'charts:write'
  | 'scenarios:read'
  | 'scenarios:write'
  | 'integrations:manage'
  | 'members:manage'
  | 'audit:read'
  | 'audit:read-sensitive'
  | 'export:create'
  | 'fields:admin-only:read'
  | 'share:manage';

const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

const ACTION_MIN_ROLE: Record<PermissionAction, OrgRole> = {
  'org:read': 'VIEWER',
  'people:read': 'VIEWER',
  'positions:read': 'VIEWER',
  'charts:read': 'VIEWER',
  'scenarios:read': 'VIEWER',
  'org:write': 'EDITOR',
  'people:write': 'EDITOR',
  'positions:write': 'EDITOR',
  'relationships:write': 'EDITOR',
  'charts:write': 'EDITOR',
  'scenarios:write': 'EDITOR',
  'export:create': 'EDITOR',
  'audit:read': 'EDITOR',
  'org:admin': 'ADMIN',
  'integrations:manage': 'ADMIN',
  'members:manage': 'ADMIN',
  'audit:read-sensitive': 'ADMIN',
  'fields:admin-only:read': 'ADMIN',
  'share:manage': 'ADMIN',
  'org:own': 'OWNER',
};

export interface Actor {
  userId: string;
  role: OrgRole;
  organisationId: string;
  isPlatformAdmin?: boolean;
}

export function can(actor: Actor | null, action: PermissionAction): boolean {
  if (!actor) return false;
  if (actor.isPlatformAdmin) return true;
  const required = ACTION_MIN_ROLE[action];
  return ROLE_RANK[actor.role] >= ROLE_RANK[required];
}

export class PermissionDeniedError extends Error {
  readonly code = 'FORBIDDEN';
  readonly action: PermissionAction;

  constructor(action: PermissionAction) {
    super(`Not permitted to ${action}`);
    this.name = 'PermissionDeniedError';
    this.action = action;
  }
}

export function assertCan(actor: Actor | null, action: PermissionAction): void {
  if (!can(actor, action)) {
    throw new PermissionDeniedError(action);
  }
}

export function isAtLeast(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
