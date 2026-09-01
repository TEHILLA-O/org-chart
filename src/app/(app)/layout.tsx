import { AppShell } from '@/components/layout/app-shell';
import { requireOrgContext } from '@/server/auth/session';
import { isDemoMode } from '@/demo/mode';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext(undefined, 'org:read');
  return (
    <AppShell userEmail={ctx.email} role={ctx.role} demo={isDemoMode()}>
      {children}
    </AppShell>
  );
}
