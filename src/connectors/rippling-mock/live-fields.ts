import { prisma } from '@/lib/db';
import { mockHolidayBalance } from '@/domain/hr/leave';

/** Applies mock Rippling leave balances onto linked people. Vendor-specific; keep in this adapter. */
export async function applyMockRipplingLeave(organisationId: string): Promise<number> {
  const identities = await prisma.externalIdentity.findMany({
    where: { organisationId, provider: 'RIPPLING', entityType: 'PERSON', personId: { not: null } },
    select: { personId: true, externalId: true },
  });
  const now = new Date();
  let updated = 0;
  for (const identity of identities) {
    if (!identity.personId) continue;
    const leave = mockHolidayBalance(identity.externalId);
    await prisma.person.update({
      where: { id: identity.personId },
      data: {
        holidayAllowanceDays: leave.allowanceDays,
        holidayRemainingDays: leave.remainingDays,
      },
    });
    await prisma.externalIdentity.updateMany({
      where: { organisationId, provider: 'RIPPLING', personId: identity.personId },
      data: { lastSeenAt: now },
    });
    updated += 1;
  }
  return updated;
}
