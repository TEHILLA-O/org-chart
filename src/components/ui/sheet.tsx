'use client';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: SheetPrimitive.DialogContentProps & { side?: 'right' | 'left' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-black/20" />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex h-full w-[min(26rem,100%)] flex-col border-[var(--border)] bg-[var(--card)] shadow-2xl',
          side === 'right' ? 'top-0 right-0 border-l' : 'top-0 left-0 border-r',
          className,
        )}
        {...props}
      >
        <SheetPrimitive.Close className="absolute top-3 right-3 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
          <X className="h-4 w-4" />
        </SheetPrimitive.Close>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
