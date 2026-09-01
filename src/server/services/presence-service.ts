import { prisma } from '@/lib/db';
import { isDemoMode } from '@/demo/mode';

const STALE_MS = 25_000;

export async function heartbeatPresence(input: {
  organisationId: string;
  userId: string;
  focusPositionId?: string | null;
}) {
  if (isDemoMode()) {
    return { viewers: [], revision: null, revisionAt: null };
  }
  const now = new Date();
  await prisma.chartPresence.upsert({
    where: {
      organisationId_userId: { organisationId: input.organisationId, userId: input.userId },
    },
    update: { lastSeenAt: now, focusPositionId: input.focusPositionId ?? null },
    create: {
      organisationId: input.organisationId,
      userId: input.userId,
      focusPositionId: input.focusPositionId ?? null,
      lastSeenAt: now,
    },
  });

  const since = new Date(Date.now() - STALE_MS);
  const viewers = await prisma.chartPresence.findMany({
    where: {
      organisationId: input.organisationId,
      lastSeenAt: { gte: since },
      userId: { not: input.userId },
    },
    include: { user: { select: { name: true, email: true } } },
  });

  const latestChange = await prisma.auditEvent.findFirst({
    where: { organisationId: input.organisationId, action: { in: ['MOVE_POSITION', 'CREATE', 'UPDATE'] } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, id: true },
  });

  return {
    viewers: viewers.map((row) => ({
      userId: row.userId,
      name: row.user.name ?? row.user.email,
      focusPositionId: row.focusPositionId,
    })),
    revision: latestChange?.id ?? null,
    revisionAt: latestChange?.createdAt ?? null,
  };
}
