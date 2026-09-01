import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getOrgHealth } from '@/server/services/chart-service';
import { requireOrgContext } from '@/server/auth/session';

export default async function ReportsPage() {
  const ctx = await requireOrgContext(undefined, 'org:read');
  const health = await getOrgHealth(ctx.organisationId);
  const vacancyPct = Math.round(health.vacancyRate * 100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Live organisation health. Wide span is {health.spanThreshold}+ direct reports.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-[var(--muted-foreground)] uppercase">Vacant seats</p>
          <p className="mt-2 text-3xl font-semibold">{health.vacantPositions}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted-foreground)] uppercase">Vacancy rate</p>
          <p className="mt-2 text-3xl font-semibold">{vacancyPct}%</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted-foreground)] uppercase">Median span</p>
          <p className="mt-2 text-3xl font-semibold">{health.medianSpan}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted-foreground)] uppercase">Wide-span managers</p>
          <p className="mt-2 text-3xl font-semibold">{health.overloadedManagers.length}</p>
        </Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-semibold">Widest spans of control</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs tracking-wide uppercase">
            <tr>
              <th className="px-4 py-2">Manager</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Direct reports</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {health.widestManagers.map((manager) => (
              <tr key={manager.positionId} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 font-medium">
                  <Link className="underline" href={`/charts?focus=${manager.positionId}`}>
                    {manager.personName}
                  </Link>
                </td>
                <td className="px-4 py-2">{manager.title}</td>
                <td className="px-4 py-2">{manager.directReportCount}</td>
                <td className="px-4 py-2">{manager.overloaded ? 'Wide span' : 'Within range'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
