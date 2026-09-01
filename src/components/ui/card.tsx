import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/15 bg-[var(--card)] p-5 shadow-[0_18px_50px_rgba(6,0,22,0.28)] backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  );
}
