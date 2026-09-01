import { describe, expect, it } from 'vitest';
import { can, type Actor } from './policy';

const actor = (role: Actor['role']): Actor => ({
  userId: 'u1',
  organisationId: 'o1',
  role,
});

describe('RBAC policy', () => {
  it('lets viewers read and forbids writes', () => {
    expect(can(actor('VIEWER'), 'charts:read')).toBe(true);
    expect(can(actor('VIEWER'), 'positions:write')).toBe(false);
    expect(can(actor('VIEWER'), 'integrations:manage')).toBe(false);
  });

  it('lets editors change structure but not integrations', () => {
    expect(can(actor('EDITOR'), 'relationships:write')).toBe(true);
    expect(can(actor('EDITOR'), 'integrations:manage')).toBe(false);
    expect(can(actor('EDITOR'), 'org:own')).toBe(false);
  });

  it('lets admins manage integrations but not transfer ownership', () => {
    expect(can(actor('ADMIN'), 'integrations:manage')).toBe(true);
    expect(can(actor('ADMIN'), 'members:manage')).toBe(true);
    expect(can(actor('ADMIN'), 'org:own')).toBe(false);
  });

  it('gives owners every action', () => {
    expect(can(actor('OWNER'), 'org:own')).toBe(true);
    expect(can(actor('OWNER'), 'fields:admin-only:read')).toBe(true);
  });

  it('denies an unauthenticated actor', () => {
    expect(can(null, 'org:read')).toBe(false);
  });
});
