import { cn } from '@/lib/utils';

export function Badge({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'default' | 'gold' | 'vacant' | 'sea' }) {
  const tones = {
    default: 'bg-[var(--muted)] text-[var(--foreground)]',
    gold: 'bg-[#f3e4b3] text-[#6a4f00]',
    vacant: 'bg-[#f4d7c8] text-[#7a3419]',
    sea: 'bg-[#d5e6e4] text-[#1d4448]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
