import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireOrgContext } from '@/server/auth/session';
import { listAuditEvents } from '@/repositories/org-repository';
import { AssistantPrivacyCard } from '@/components/admin/assistant-privacy-card';
import { isDemoMode } from '@/demo/mode';
import { demoMembers } from '@/demo/northstar';

export default async function AdministrationPage() {
  const ctx = await requireOrgContext(undefined, 'org:admin');
  const members = isDemoMode()
    ? demoMembers()
    : await prisma.organisationMembership.findMany({
        where: { organisationId: ctx.organisationId },
        include: { user: { select: { email: true, name: true, lastLoginAt: true } } },
      });
  const audit = await listAuditEvents(ctx.organisationId, 15);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Administration</h1>
      <AssistantPrivacyCard />
      <Card>
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex justify-between">
              <span>
                {member.user.name} · {member.user.email}
              </span>
              <span className="uppercase">{member.role}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">Audit log</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.map((event) => (
            <li key={event.id} className="flex justify-between gap-3">
              <span>
                {event.action} · {event.entityType}
              </span>
              <span className="text-[var(--muted-foreground)]">{event.createdAt.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
