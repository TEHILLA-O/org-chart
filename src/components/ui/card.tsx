import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_10px_28px_rgba(23,20,31,0.05)]', className)}
      {...props}
    />
  );
}
