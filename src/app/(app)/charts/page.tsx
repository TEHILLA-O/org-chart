import { Suspense } from 'react';
import { auth } from '@/auth';
import { OrgChart } from '@/components/chart/org-chart';

export default async function ChartsPage() {
  const session = await auth();
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--muted-foreground)]">Opening chart…</div>}>
      <OrgChart role={session?.user.role ?? 'VIEWER'} />
    </Suspense>
  );
}
