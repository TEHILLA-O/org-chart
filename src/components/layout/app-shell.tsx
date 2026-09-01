'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppShell({
  children,
  userEmail,
  role,
}: {
  children: React.ReactNode;
  userEmail: string;
  role: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isChart = pathname.startsWith('/charts');

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        userEmail={userEmail}
        role={role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {isChart ? null : (
          <header className="no-print flex h-14 shrink-0 items-center justify-between px-6">
            <p className="text-sm text-[var(--muted-foreground)]">Northstar Holdings</p>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign out
            </Button>
          </header>
        )}
        <main className={cn('min-h-0 flex-1 overflow-auto', isChart && 'overflow-hidden p-0')}>
          {isChart ? children : <div className="px-6 pb-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
