import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { getCorrelationId } from '@/lib/correlation';
import { hashShareToken, randomToken } from '@/lib/crypto';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationAppError } from '@/lib/errors';
import { can, type Actor } from '@/domain/permissions/policy';
import { getChartPayload, requireDefaultChart } from '@/server/services/chart-service';
import { assertWritable, isDemoMode } from '@/demo/mode';

function shareUrls(token: string) {
  const origin = config().APP_URL.replace(/\/$/, '');
  return {
    url: `${origin}/share/${token}`,
    embedUrl: `${origin}/embed/${token}`,
  };
}

function summariseShare(link: {
  id: string;
  permissions: string;
  allowEmbed: boolean;
  allowedFields: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  viewCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  passwordHash: string | null;
}) {
  return {
    id: link.id,
    permissions: link.permissions,
    allowEmbed: link.allowEmbed,
    allowedFields: link.allowedFields,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    viewCount: link.viewCount,
    lastViewedAt: link.lastViewedAt,
    createdAt: link.createdAt,
    hasPassword: Boolean(link.passwordHash),
    active: !link.revokedAt && (!link.expiresAt || link.expiresAt > new Date()),
  };
}

export async function listShareLinks(organisationId: string, actor: Actor) {
  if (!can(actor, 'share:manage')) {
    throw new ForbiddenError();
  }
  if (isDemoMode()) {
    return { shares: [] as ReturnType<typeof summariseShare>[] };
  }
  const links = await prisma.shareLink.findMany({
    where: { organisationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return { shares: links.map(summariseShare) };
}

export async function createShareLink(input: {
  organisationId: string;
  actor: Actor;
  allowEmbed?: boolean;
  expiresInDays?: number | null;
  allowedFields?: string[];
  password?: string;
}) {
  if (!can(input.actor, 'share:manage')) {
    throw new ForbiddenError();
  }
  assertWritable();

  const chart = await requireDefaultChart(input.organisationId);
  const token = randomToken();
  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const link = await prisma.shareLink.create({
    data: {
      organisationId: input.organisationId,
      chartId: chart.id,
      tokenHash: hashShareToken(token),
      passwordHash: input.password ? await hash(input.password, 10) : null,
      expiresAt,
      allowEmbed: Boolean(input.allowEmbed),
      allowedFields: input.allowedFields ?? [],
      createdById: input.actor.userId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actor.userId,
      actorType: 'USER',
      action: 'SHARE_CREATED',
      entityType: 'ShareLink',
      entityId: link.id,
      newState: { allowEmbed: link.allowEmbed, expiresAt, allowedFields: link.allowedFields },
      source: 'LOCAL',
      correlationId: getCorrelationId(),
    },
  });

  return {
    share: summariseShare(link),
    token,
    ...shareUrls(token),
  };
}

export async function revokeShareLink(organisationId: string, actor: Actor, id: string) {
  if (!can(actor, 'share:manage')) {
    throw new ForbiddenError();
  }
  assertWritable();
  const link = await prisma.shareLink.findFirst({ where: { id, organisationId } });
  if (!link) throw new NotFoundError('Share link not found.');
  if (link.revokedAt) return summariseShare(link);

  const updated = await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });

  await prisma.auditEvent.create({
    data: {
      organisationId,
      actorId: actor.userId,
      actorType: 'USER',
      action: 'SHARE_REVOKED',
      entityType: 'ShareLink',
      entityId: link.id,
      source: 'LOCAL',
      correlationId: getCorrelationId(),
    },
  });

  return summariseShare(updated);
}

export async function getPublicShareGraph(input: {
  token: string;
  password?: string | null;
  embed?: boolean;
}) {
  const link = await prisma.shareLink.findUnique({
    where: { tokenHash: hashShareToken(input.token) },
    include: { chart: { select: { name: true } } },
  });
  if (!link || link.revokedAt) {
    throw new NotFoundError('This share link is not available.');
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new NotFoundError('This share link has expired.');
  }
  if (input.embed && !link.allowEmbed) {
    throw new ForbiddenError('Embedding is not enabled for this link.');
  }
  if (link.passwordHash) {
    if (!input.password) {
      throw new UnauthorizedError('This chart requires a password.');
    }
    const ok = await compare(input.password, link.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('That password is not correct.');
    }
  }

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const payload = await getChartPayload({
    organisationId: link.organisationId,
    share: { isShareLink: true, allowedFields: link.allowedFields },
  });

  return {
    ...payload,
    chart: { name: link.chart.name },
    share: {
      allowEmbed: link.allowEmbed,
      permissions: link.permissions,
    },
  };
}

export function assertShareToken(token: string) {
  if (!token || token.length < 16) {
    throw new ValidationAppError('Invalid share token.');
  }
}
