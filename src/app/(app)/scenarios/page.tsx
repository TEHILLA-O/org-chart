import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireOrgContext } from '@/server/auth/session';

export default async function ScenariosPage() {
  const ctx = await requireOrgContext(undefined, 'scenarios:read');
  const scenarios = await prisma.scenario.findMany({
    where: { organisationId: ctx.organisationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { changes: true } }, baseSnapshot: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Planning overlays. Changes here never write to live organisation tables.
        </p>
      </div>
      <div className="grid gap-3">
        {scenarios.map((scenario) => (
          <Card key={scenario.id}>
            <p className="text-lg font-semibold">{scenario.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{scenario.description}</p>
            <p className="mt-2 text-xs uppercase">
              {scenario.status} · {scenario._count.changes} changes · base {scenario.baseSnapshot.name}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
