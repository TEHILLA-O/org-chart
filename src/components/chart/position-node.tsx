'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { initials } from '@/lib/utils';
import type { ChartNodeModel } from '@/domain/chart/project';
import { cn } from '@/lib/utils';

type PositionNodeData = ChartNodeModel & { layoutDirection?: 'TOP_DOWN' | 'LEFT_RIGHT' };

export function PositionNode({ data, selected }: NodeProps) {
  const model = data as unknown as PositionNodeData;
  const occupant = model.occupants[0];
  const name = occupant?.displayName ?? 'Open role';
  const horizontal = model.layoutDirection === 'LEFT_RIGHT';
  const strip = model.departmentColour ?? '#2f5d62';
  const onLeave = occupant?.status === 'ON_LEAVE';
  const leaveDays = occupant?.holidayRemainingDays;
  const showLeave = onLeave || (typeof leaveDays === 'number' && leaveDays <= 8);

  return (
    <div
      className={cn(
        'relative flex h-[156px] w-[220px] flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_10px_28px_rgba(23,20,31,0.07)] transition-shadow',
        selected
          ? 'border-[#2f5d62] ring-4 ring-[#2f5d62]/12'
          : 'border-transparent hover:shadow-[0_14px_32px_rgba(23,20,31,0.1)]',
        model.isVacant && 'border-dashed border-[#c8b8a8] bg-[#fbf8f3]',
        model.planned && 'ring-2 ring-[#c9a227]/50',
        model.moved && !model.planned && 'ring-2 ring-[#2f5d62]/35',
      )}
    >
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#c9c3b8]"
      />
      <div className="flex flex-1 flex-col px-3.5 pt-3.5 pb-2">
        <div className="flex items-start gap-2.5">
          {occupant?.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={occupant.profilePhotoUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                model.isVacant ? 'bg-[#efe3d6] text-[#8a4b2f]' : 'bg-[#2f5d62] text-[#f7f4ec]',
              )}
            >
              {model.isVacant ? '+' : initials(name)}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">{name}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted-foreground)]">
              {model.title}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {model.planned ? (
            <span className="rounded-full bg-[#f6eee4] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#8a4b2f] uppercase">
              Plan
            </span>
          ) : null}
          {model.moved ? (
            <span className="rounded-full bg-[#e8f3f1] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#2f5d62] uppercase">
              Moved
            </span>
          ) : null}
          {showLeave ? (
            <span className="rounded-full bg-[#e8f3f1] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#2f5d62] uppercase">
              {onLeave ? 'On leave' : `${leaveDays}d leave`}
            </span>
          ) : null}
          {model.occupants.length > 1 ? (
            <span className="rounded-full bg-[#efeae1] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#5c5666] uppercase">
              Shared
            </span>
          ) : null}
          {model.hasSecondary ? (
            <span className="rounded-full bg-[#f6eee4] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#8a4b2f] uppercase">
              Dotted
            </span>
          ) : null}
          {model.collapsed ? (
            <span className="rounded-full bg-[#efeae1] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#5c5666] uppercase">
              +{model.directReportCount}
            </span>
          ) : null}
        </div>
      </div>
      <div
        className="flex h-8 items-center justify-between px-3 text-[11px] font-medium text-white"
        style={{ background: model.isVacant ? '#b9a898' : strip }}
      >
        <span className="truncate">{model.isVacant ? 'Open role' : (model.departmentName ?? 'Unassigned')}</span>
        {model.directReportCount > 0 ? (
          <span className="ml-2 shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {model.directReportCount}
          </span>
        ) : null}
      </div>
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#c9c3b8]"
      />
    </div>
  );
}
