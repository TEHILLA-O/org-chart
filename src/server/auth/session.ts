import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';
import { type Actor, type PermissionAction, assertCan } from '@/domain/permissions/policy';
import type { OrgRole } from '@prisma/client';
import { isDemoMode } from '@/demo/mode';
import { demoSession } from '@/demo/northstar';

export interface SessionContext {
  userId: string;
  email: string;
  organisationId: string;
  role: OrgRole;
  actor: Actor;
}

async function guestContext(): Promise<SessionContext> {
  if (isDemoMode()) {
    return demoSession();
  }
  const membership =
    (await prisma.organisationMembership.findFirst({
      where: { role: 'OWNER' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true, isPlatformAdmin: true } } },
    })) ??
    (await prisma.organisationMembership.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true, isPlatformAdmin: true } } },
    }));

  if (!membership) {
    throw new ForbiddenError('No organisation is set up yet.');
  }

  const actor: Actor = {
    userId: membership.userId,
    organisationId: membership.organisationId,
    role: membership.role,
    isPlatformAdmin: membership.user.isPlatformAdmin,
  };

  return {
    userId: membership.userId,
    email: membership.user.email,
    organisationId: membership.organisationId,
    role: membership.role,
    actor,
  };
}

async function contextFromSession(
  session: { userId: string; email: string },
  organisationId: string | undefined,
  action: PermissionAction,
): Promise<SessionContext> {
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

export async function requireSession(): Promise<{ userId: string; email: string }> {
  if (isDemoMode()) {
    const guest = demoSession();
    return { userId: guest.userId, email: guest.email };
  }
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, email: session.user.email ?? '' };
  }
  const guest = await guestContext();
  return { userId: guest.userId, email: guest.email };
}

export async function requireOrgContext(
  organisationId?: string,
  action: PermissionAction = 'org:read',
): Promise<SessionContext> {
  if (isDemoMode()) {
    const guest = demoSession();
    assertCan(guest.actor, action);
    return guest;
  }
  const session = await auth();
  if (session?.user?.id) {
    return contextFromSession(
      { userId: session.user.id, email: session.user.email ?? '' },
      organisationId,
      action,
    );
  }

  const guest = await guestContext();
  assertCan(guest.actor, action);
  return guest;
}
