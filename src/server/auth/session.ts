import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { type Actor, type PermissionAction, assertCan } from '@/domain/permissions/policy';
import type { OrgRole } from '@prisma/client';

export interface SessionContext {
  userId: string;
  email: string;
  organisationId: string;
  role: OrgRole;
  actor: Actor;
}

export async function requireSession(): Promise<{ userId: string; email: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return { userId: session.user.id, email: session.user.email ?? '' };
}

export async function requireOrgContext(
  organisationId?: string,
  action: PermissionAction = 'org:read',
): Promise<SessionContext> {
  const session = await requireSession();
  const membership = await prisma.organisationMembership.findFirst({
    where: organisationId
      ? { userId: session.userId, organisationId }
      : { userId: session.userId },
    include: { user: { select: { isPlatformAdmin: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this organisation.');
  }

  const actor: Actor = {
    userId: session.userId,
    organisationId: membership.organisationId,
    role: membership.role,
    isPlatformAdmin: membership.user.isPlatformAdmin,
  };

  assertCan(actor, action);

  return {
    userId: session.userId,
    email: session.email,
    organisationId: membership.organisationId,
    role: membership.role,
    actor,
  };
}
