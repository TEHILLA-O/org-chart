'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { initials, portraitUrl } from '@/lib/utils';
import type { ChartNodeModel } from '@/domain/chart/project';
import { cn } from '@/lib/utils';

type PositionNodeData = ChartNodeModel & { layoutDirection?: 'TOP_DOWN' | 'LEFT_RIGHT' };

export function PositionNode({ data, selected }: NodeProps) {
  const model = data as unknown as PositionNodeData;
  const occupant = model.occupants[0];
  const name = occupant?.displayName ?? 'Open role';
  const horizontal = model.layoutDirection === 'LEFT_RIGHT';
  const strip = model.departmentColour ?? '#22d3ee';
  const onLeave = occupant?.status === 'ON_LEAVE';
  const leaveDays = occupant?.holidayRemainingDays;
  const showLeave = onLeave || (typeof leaveDays === 'number' && leaveDays <= 8);
  const photo = occupant
    ? portraitUrl(occupant.personId, occupant.profilePhotoUrl)
    : null;

  return (
    <div className="relative h-[188px] w-[200px]">
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-[#1c0840] !bg-[#22d3ee]"
      />
      <div
        className={cn(
          'motion-node absolute inset-x-0 top-8 bottom-0 flex flex-col overflow-hidden rounded-2xl border bg-[rgba(28,8,62,0.86)] text-white shadow-[0_16px_40px_rgba(6,0,22,0.35)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1',
          selected
            ? 'border-[#22d3ee] shadow-[0_18px_48px_rgba(34,211,238,0.28)] ring-4 ring-[#22d3ee]/25'
            : 'border-white/12 hover:shadow-[0_18px_46px_rgba(34,211,238,0.18)]',
          model.isVacant && 'border-dashed border-white/30 bg-[rgba(28,8,62,0.5)]',
          model.planned && 'ring-2 ring-[#e879f9]/50',
          model.moved && !model.planned && 'ring-2 ring-[#22d3ee]/40',
        )}
      >
        <div
          className="flex h-10 shrink-0 items-start justify-end px-2 pt-1.5"
          style={{ background: model.isVacant ? 'rgba(255,255,255,0.18)' : strip }}
        >
          {model.directReportCount > 0 ? (
            <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {model.directReportCount}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col items-center px-3 pt-8 pb-2 text-center">
          <p className="w-full truncate text-[13px] font-semibold leading-tight tracking-tight">{name}</p>
          <p className="mt-0.5 line-clamp-2 w-full text-[11px] leading-snug text-[var(--muted-foreground)]">
            {model.title}
          </p>
          <p className="mt-1 w-full truncate text-[10px] tracking-wide text-white/55 uppercase">
            {model.isVacant ? 'Open role' : (model.departmentName ?? 'Unassigned')}
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            {model.planned ? (
              <span className="rounded-full bg-[#e879f9]/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#f5d0fe] uppercase">
                Plan
              </span>
            ) : null}
            {model.moved ? (
              <span className="rounded-full bg-[#22d3ee]/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#67e8f9] uppercase">
                Moved
              </span>
            ) : null}
            {showLeave ? (
              <span className="rounded-full bg-[#22d3ee]/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#67e8f9] uppercase">
                {onLeave ? 'On leave' : `${leaveDays}d leave`}
              </span>
            ) : null}
            {model.occupants.length > 1 ? (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white/80 uppercase">
                Shared
              </span>
            ) : null}
            {model.hasSecondary ? (
              <span className="rounded-full bg-[#e879f9]/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#f5d0fe] uppercase">
                Dotted
              </span>
            ) : null}
            {model.collapsed ? (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white/80 uppercase">
                +{model.directReportCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-4 ring-[#1c0840] shadow-[0_8px_20px_rgba(6,0,22,0.35)]"
          />
        ) : (
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-[#1c0840] shadow-[0_8px_20px_rgba(6,0,22,0.35)]',
              model.isVacant ? 'bg-white/15 text-[#67e8f9]' : 'bg-[#22d3ee] text-[#071018]',
            )}
          >
            {model.isVacant ? '+' : initials(name)}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-[#1c0840] !bg-[#22d3ee]"
      />
    </div>
  );
}
