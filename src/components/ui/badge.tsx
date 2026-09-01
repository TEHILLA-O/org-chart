import { cn } from '@/lib/utils';

export function Badge({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'default' | 'gold' | 'vacant' | 'sea' }) {
  const tones = {
    default: 'bg-white/10 text-white',
    gold: 'bg-[#e879f9]/20 text-[#f5d0fe]',
    vacant: 'bg-[#22d3ee]/18 text-[#a5f3fc]',
    sea: 'bg-[#22d3ee]/20 text-[#67e8f9]',
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
