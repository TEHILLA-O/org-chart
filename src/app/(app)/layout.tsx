import { AppShell } from '@/components/layout/app-shell';
import { DatabaseSetup } from '@/components/layout/database-setup';
import { requireOrgContext } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.DATABASE_URL) {
    return <DatabaseSetup />;
  }

  try {
    const ctx = await requireOrgContext(undefined, 'org:read');
    return (
      <AppShell userEmail={ctx.email} role={ctx.role}>
        {children}
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The database could not be reached.';
    return <DatabaseSetup message={message} />;
  }
}
