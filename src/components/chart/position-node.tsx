'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';
import type { ChartNodeModel } from '@/domain/chart/project';
import { cn } from '@/lib/utils';

type PositionNodeData = ChartNodeModel & { layoutDirection?: 'TOP_DOWN' | 'LEFT_RIGHT' };

export function PositionNode({ data, selected }: NodeProps) {
  const model = data as unknown as PositionNodeData;
  const occupant = model.occupants[0];
  const name = occupant?.displayName ?? 'Vacant';
  const horizontal = model.layoutDirection === 'LEFT_RIGHT';
  const strip = model.departmentColour ?? '#2f5d62';

  return (
    <div
      className={cn(
        'relative h-[132px] w-[268px] overflow-hidden rounded-lg border bg-white shadow-sm',
        selected ? 'border-[#c9a227] ring-2 ring-[#c9a227]/40' : 'border-[var(--border)]',
        model.isVacant && 'border-dashed bg-[#fbf6f1]',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: strip }} />
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        className="!bg-[#2f5d62]"
      />
      <div className="flex h-full flex-col px-3 py-2.5 pl-4">
        <div className="flex gap-3">
          {occupant?.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={occupant.profilePhotoUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                model.isVacant ? 'bg-[#f4d7c8] text-[#7a3419]' : 'bg-[#2f5d62] text-[#f7f4ec]',
              )}
            >
              {model.isVacant ? 'V' : initials(name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{name}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{model.title}</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              {[model.departmentName, model.locationName].filter(Boolean).join(' · ') || 'Unassigned'}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {model.isVacant ? <Badge tone="vacant">Vacant</Badge> : null}
          {model.isAssistant ? <Badge tone="gold">Assistant</Badge> : null}
          {model.occupants.length > 1 ? <Badge tone="sea">Shared</Badge> : null}
          {model.hasSecondary ? <Badge>Dotted line</Badge> : null}
          {model.overloaded ? <Badge tone="vacant">Wide span</Badge> : null}
          {model.collapsed ? <Badge>Collapsed · {model.directReportCount}</Badge> : null}
        </div>
        {model.directReportCount > 0 ? (
          <p className="mt-auto text-[10px] tracking-wide text-[var(--muted-foreground)] uppercase">
            {model.directReportCount} direct · {model.downstreamCount} downstream
          </p>
        ) : (
          <p className="mt-auto text-[10px] tracking-wide text-[var(--muted-foreground)] uppercase">
            Individual contributor
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        className="!bg-[#2f5d62]"
      />
    </div>
  );
}
