import { Suspense } from 'react';
import { OrgChart } from '@/components/chart/org-chart';
import { requireOrgContext } from '@/server/auth/session';

export default async function ChartsPage() {
  const ctx = await requireOrgContext(undefined, 'charts:read');
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--muted-foreground)]">Opening chart…</div>}>
      <OrgChart role={ctx.role} />
    </Suspense>
  );
}
