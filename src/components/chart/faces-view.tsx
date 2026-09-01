'use client';

import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';
import type { ChartNodeModel } from '@/domain/chart/project';
import { cn } from '@/lib/utils';

export function FacesView({
  nodes,
  selectedId,
  onSelect,
  query,
}: {
  nodes: ChartNodeModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
}) {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? nodes.filter((node) => {
        const haystack = [
          node.title,
          node.departmentName,
          node.locationName,
          node.managerName,
          ...node.occupants.map((occupant) => `${occupant.displayName} ${occupant.email ?? ''}`),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
    : nodes;
  const groups = groupByDepartment(filtered);

  return (
    <div className="h-full overflow-auto p-4">
      {groups.map((group) => (
        <section key={group.name} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: group.colour ?? '#2f5d62' }}
            />
            <h2 className="text-sm font-semibold">{group.name}</h2>
            <span className="text-xs text-[var(--muted-foreground)]">{group.nodes.length}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
            {group.nodes.map((node) => {
              const occupant = node.occupants[0];
              const name = occupant?.displayName ?? 'Vacant';
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelect(node.id)}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-white text-left shadow-[0_10px_24px_rgba(23,20,31,0.06)] transition-shadow hover:shadow-[0_14px_30px_rgba(23,20,31,0.1)]',
                    selectedId === node.id
                      ? 'border-[#2f5d62] ring-4 ring-[#2f5d62]/12'
                      : 'border-transparent',
                    node.isVacant && 'border-dashed border-[#c8b8a8] bg-[#fbf8f3]',
                  )}
                >
                  <div className="flex flex-col items-center p-4 text-center">
                    {occupant?.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={occupant.profilePhotoUrl}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold',
                          node.isVacant ? 'bg-[#f4d7c8] text-[#7a3419]' : 'bg-[#2f5d62] text-[#f7f4ec]',
                        )}
                      >
                        {node.isVacant ? 'V' : initials(name)}
                      </div>
                    )}
                    <p className="mt-3 w-full truncate text-sm font-semibold">{name}</p>
                    <p className="w-full truncate text-xs text-[var(--muted-foreground)]">{node.title}</p>
                    <p className="mt-1 w-full truncate text-[11px] text-[var(--muted-foreground)]">
                      {node.locationName ?? '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      {node.isVacant ? <Badge tone="vacant">Open</Badge> : null}
                      {node.occupants.length > 1 ? <Badge tone="sea">Shared</Badge> : null}
                    </div>
                  </div>
                  <div
                    className="h-7 w-full px-2 text-center text-[11px] leading-7 font-medium text-white"
                    style={{ background: node.isVacant ? '#b9a898' : (node.departmentColour ?? '#2f5d62') }}
                  >
                    <span className="block truncate">{node.departmentName ?? 'Unassigned'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupByDepartment(nodes: ChartNodeModel[]) {
  const map = new Map<string, { name: string; colour: string | null; nodes: ChartNodeModel[] }>();
  for (const node of nodes) {
    const name = node.departmentName ?? 'Unassigned';
    const existing = map.get(name);
    if (existing) {
      existing.nodes.push(node);
    } else {
      map.set(name, { name, colour: node.departmentColour, nodes: [node] });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
