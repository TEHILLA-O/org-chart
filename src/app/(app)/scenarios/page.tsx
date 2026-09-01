import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { requireOrgContext } from '@/server/auth/session';
import { loadOrganisationGraph } from '@/repositories/org-repository';
import { applyScenarioOverlay, diffPrimaryManagers } from '@/domain/scenario/overlay';
import { toChangeViews } from '@/server/services/scenario-service';
import { isDemoMode } from '@/demo/mode';

export default async function ScenariosPage() {
  const ctx = await requireOrgContext(undefined, 'scenarios:read');
  const [scenarios, live] = await Promise.all([
    isDemoMode()
      ? Promise.resolve([
          {
            id: 'scenario-demo',
            name: '2027 Restructure',
            description: 'Planning sandbox — does not touch live data',
            status: 'DRAFT',
            changes: [],
            baseSnapshot: null,
            _count: { changes: 0 },
          },
        ])
      : prisma.scenario.findMany({
      where: { organisationId: ctx.organisationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        changes: { orderBy: { sequence: 'asc' } },
        baseSnapshot: true,
        _count: { select: { changes: true } },
      },
    }),
    loadOrganisationGraph(ctx.organisationId),
  ]);

  const liveGraph = {
    positions: live.positions,
    people: live.people,
    assignments: live.assignments,
    relationships: live.relationships,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Planning overlays on the current live organisation. Changes never write to live tables.
        </p>
      </div>
      <div className="grid gap-3">
        {scenarios.map((scenario) => {
          const overlay = applyScenarioOverlay(liveGraph, toChangeViews(scenario.changes));
          const diff = diffPrimaryManagers(liveGraph, overlay);
          const titles = new Map(overlay.positions.map((position) => [position.id, position.title]));
          return (
            <Card key={scenario.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{scenario.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{scenario.description}</p>
                  <p className="mt-2 text-xs uppercase">
                    {scenario.status} · {scenario._count.changes} changes · base{' '}
                    {scenario.baseSnapshot?.name ?? 'live organisation'}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/charts?scenario=${scenario.id}`}>Open overlay</Link>
                </Button>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Live vs overlay
                  </p>
                  <p className="mt-1">
                    {diff.movedCount} moved · {diff.addedCount} planned seats
                  </p>
                  {diff.moved.length ? (
                    <ul className="mt-2 space-y-1 text-[var(--muted-foreground)]">
                      {diff.moved.map((item) => (
                        <li key={item.positionId}>
                          {item.title}: {item.from ? titles.get(item.from) ?? 'Unknown' : 'Top'} →{' '}
                          {item.to ? titles.get(item.to) ?? 'Unknown' : 'Top'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[var(--muted-foreground)]">No reporting moves yet.</p>
                  )}
                  {diff.added.length ? (
                    <ul className="mt-2 space-y-1 text-[var(--muted-foreground)]">
                      {diff.added.map((item) => (
                        <li key={item.positionId}>Planned: {item.title}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Change log
                  </p>
                  {scenario.changes.length === 0 ? (
                    <p className="mt-2 text-[var(--muted-foreground)]">
                      Drag seats on the chart in planning mode, or add a planned vacancy.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-[var(--muted-foreground)]">
                      {scenario.changes.map((change) => (
                        <li key={change.id}>
                          {change.sequence}. {change.changeType.replaceAll('_', ' ').toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
