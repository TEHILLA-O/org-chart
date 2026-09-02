import { AppShell } from '@/components/layout/app-shell';
import { requireOrgContext } from '@/server/auth/session';
import { isDemoMode } from '@/demo/mode';
import { prisma } from '@/lib/db';
import { demoOrganisation } from '@/demo/northstar';
import { displayCompanyName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext(undefined, 'org:read');
  const organisation = isDemoMode()
    ? demoOrganisation()
    : await prisma.organisation.findFirst({
        where: { id: ctx.organisationId, deletedAt: null },
        select: { name: true },
      });
  return (
    <AppShell
      userEmail={ctx.email}
      role={ctx.role}
      demo={isDemoMode()}
      organisationName={displayCompanyName(organisation?.name)}
    >
      {children}
    </AppShell>
  );
}
