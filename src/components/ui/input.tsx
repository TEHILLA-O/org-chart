import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-full border border-transparent bg-[var(--muted)] px-3 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        className,
      )}
      {...props}
    />
  );
}
