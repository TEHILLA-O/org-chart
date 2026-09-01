'use client';

import type { ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMPTY = '__empty__';

export function Select({
  value,
  onValueChange,
  className,
  children,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root
      value={value === '' ? EMPTY : value}
      onValueChange={(next) => onValueChange(next === EMPTY ? '' : next)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'inline-flex h-9 min-w-[10rem] items-center justify-between gap-2 rounded-full border border-white/14 bg-[rgba(28,8,62,0.78)] px-3.5 text-left text-sm text-white outline-none backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50',
          className,
        )}
      >
        <SelectPrimitive.Value />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#67e8f9]" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[80] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/15 bg-[#1c0840] text-white shadow-[0_18px_50px_rgba(6,0,22,0.5)]"
        >
          <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto p-1">{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SelectPrimitive.Item
      value={value === '' ? EMPTY : value}
      className={cn(
        'flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm text-white outline-none data-[highlighted]:bg-[#22d3ee]/20 data-[highlighted]:text-[#a5f3fc] data-[state=checked]:bg-[#22d3ee] data-[state=checked]:text-[#071018]',
        className,
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
