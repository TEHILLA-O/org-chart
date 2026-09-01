'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Focus, Printer, Search, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ChartFilter } from '@/domain/org/types';
import { activeFilterCount } from '@/domain/chart/filters';
import type { ChartSurface } from '@/components/chart/chart-surface';
import { cn } from '@/lib/utils';

interface SearchHit {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  positionId: string | null;
}

const SURFACES: Array<{ id: ChartSurface; label: string }> = [
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'faces', label: 'Faces' },
  { id: 'directory', label: 'Directory' },
  { id: 'grid', label: 'Grid' },
];

export function ChartToolbar({
  departments,
  locations,
  groups,
  filters,
  onFilters,
  onSearchSelect,
  layout,
  onLayout,
  mode,
  onMode,
  canEdit,
  onFit,
  surface,
  onSurface,
  spotlight,
  onSpotlight,
  onPrint,
  onExport,
  onShare,
  rosterQuery,
  onRosterQuery,
}: {
  departments: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
  filters: ChartFilter;
  onFilters: (filters: ChartFilter) => void;
  onSearchSelect: (positionId: string) => void;
  layout: 'TOP_DOWN' | 'LEFT_RIGHT';
  onLayout: (layout: 'TOP_DOWN' | 'LEFT_RIGHT') => void;
  mode: 'LIVE' | 'PLANNING';
  onMode: (mode: 'LIVE' | 'PLANNING') => void;
  canEdit: boolean;
  onFit: () => void;
  surface: ChartSurface;
  onSurface: (surface: ChartSurface) => void;
  spotlight: boolean;
  onSpotlight: (value: boolean) => void;
  onPrint: () => void;
  onExport: (format: 'csv' | 'xlsx') => void;
  onShare: () => void;
  rosterQuery: string;
  onRosterQuery: (value: string) => void;
}) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['search', q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Search failed');
      return (await response.json()) as { results: SearchHit[] };
    },
  });

  const count = activeFilterCount(filters);

  return (
    <div className="no-print border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex rounded-md border border-[var(--border)] p-0.5">
          {SURFACES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                surface === item.id
                  ? 'bg-[#2f5d62] text-[#f7f4ec]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
              )}
              onClick={() => onSurface(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[16rem] flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            className="pl-8"
            placeholder={
              surface === 'hierarchy'
                ? 'Search people, positions, departments…'
                : 'Filter this view…'
            }
            value={surface === 'hierarchy' ? q : rosterQuery}
            onChange={(event) => {
              if (surface === 'hierarchy') setQ(event.target.value);
              else onRosterQuery(event.target.value);
            }}
          />
          {surface === 'hierarchy' && data?.results?.length ? (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[var(--border)] bg-white shadow-lg">
              {data.results.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                    onClick={() => {
                      if (hit.positionId) onSearchSelect(hit.positionId);
                      setQ('');
                    }}
                  >
                    <span className="font-medium">{hit.title}</span>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                      {hit.kind} · {hit.subtitle}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('xlsx')}>
          XLSX
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" />
          Copy link
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-white px-2 text-sm"
          value={filters.groupIds?.[0] ?? ''}
          onChange={(event) =>
            onFilters({
              ...filters,
              groupIds: event.target.value ? [event.target.value] : undefined,
            })
          }
        >
          <option value="">All groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-white px-2 text-sm"
          value={filters.departmentIds?.[0] ?? ''}
          onChange={(event) =>
            onFilters({
              ...filters,
              departmentIds: event.target.value ? [event.target.value] : undefined,
            })
          }
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-white px-2 text-sm"
          value={filters.locationIds?.[0] ?? ''}
          onChange={(event) =>
            onFilters({
              ...filters,
              locationIds: event.target.value ? [event.target.value] : undefined,
            })
          }
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-white px-2 text-sm"
          value={filters.positionStatuses?.[0] ?? ''}
          onChange={(event) =>
            onFilters({
              ...filters,
              positionStatuses: event.target.value
                ? [event.target.value as NonNullable<ChartFilter['positionStatuses']>[number]]
                : undefined,
            })
          }
        >
          <option value="">All positions</option>
          <option value="VACANT">Vacancies</option>
          <option value="ACTIVE">Active</option>
        </select>
        {count > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => onFilters({})}>
            Clear all filters
          </Button>
        ) : null}
        {filters.departmentIds ? <Badge tone="sea">Department</Badge> : null}
        {filters.locationIds ? <Badge tone="sea">Location</Badge> : null}
        {filters.positionStatuses ? <Badge tone="vacant">Status</Badge> : null}
        {filters.groupIds ? <Badge tone="gold">Group</Badge> : null}

        {surface === 'hierarchy' ? (
          <>
            <Button
              variant={layout === 'TOP_DOWN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLayout('TOP_DOWN')}
            >
              Top-down
            </Button>
            <Button
              variant={layout === 'LEFT_RIGHT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLayout('LEFT_RIGHT')}
            >
              Left-right
            </Button>
            <Button variant="outline" size="sm" onClick={onFit}>
              Zoom to fit
            </Button>
            <Button
              variant={spotlight ? 'gold' : 'outline'}
              size="sm"
              onClick={() => onSpotlight(!spotlight)}
            >
              <Focus className="h-3.5 w-3.5" />
              Spotlight
            </Button>
          </>
        ) : null}
        {canEdit ? (
          <Button
            variant={mode === 'LIVE' ? 'gold' : 'outline'}
            size="sm"
            onClick={() => onMode(mode === 'LIVE' ? 'PLANNING' : 'LIVE')}
          >
            {mode === 'LIVE' ? 'Live mode' : 'Planning mode'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function filterQuery(filters: ChartFilter): string {
  const params = new URLSearchParams();
  if (filters.departmentIds?.length) params.set('departmentIds', filters.departmentIds.join(','));
  if (filters.locationIds?.length) params.set('locationIds', filters.locationIds.join(','));
  if (filters.positionStatuses?.length) params.set('positionStatuses', filters.positionStatuses.join(','));
  if (filters.personStatuses?.length) params.set('personStatuses', filters.personStatuses.join(','));
  if (filters.personId) params.set('personId', filters.personId);
  if (filters.managerPositionId) params.set('managerPositionId', filters.managerPositionId);
  if (filters.groupIds?.length) params.set('groupIds', filters.groupIds.join(','));
  return params.toString();
}
