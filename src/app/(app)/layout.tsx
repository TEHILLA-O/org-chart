import { AppShell } from '@/components/layout/app-shell';
import { requireOrgContext } from '@/server/auth/session';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext(undefined, 'org:read');

  return (
    <AppShell userEmail={ctx.email} role={ctx.role}>
      {children}
    </AppShell>
  );
}
