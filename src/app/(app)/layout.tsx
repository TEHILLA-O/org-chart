import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <AppShell userEmail={session.user.email ?? ''} role={session.user.role ?? 'VIEWER'}>
      {children}
    </AppShell>
  );
}
