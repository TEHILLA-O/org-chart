'use client';

export function ChartLegend() {
  const items = [
    { label: 'Filled seat', swatch: 'bg-[#2f5d62]' },
    { label: 'Open role', swatch: 'border border-dashed border-[#c8b8a8] bg-[#fbf8f3]' },
    { label: 'Department colour', swatch: 'bg-[#c9a227]' },
    { label: 'Dotted line', swatch: 'border-t-2 border-dashed border-[#c08a62] bg-transparent h-0 w-6 mt-2' },
  ];

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-2xl border border-white/80 bg-white/90 px-3.5 py-2.5 shadow-[0_10px_28px_rgba(23,20,31,0.08)] backdrop-blur no-print">
      <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">Legend</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px]">
            <span className={['h-2.5 w-2.5 shrink-0 rounded-full', item.swatch].join(' ')} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
