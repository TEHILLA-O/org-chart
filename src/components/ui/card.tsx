import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm', className)}
      {...props}
    />
  );
}
