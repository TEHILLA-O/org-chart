'use client';

export function ChartLegend() {
  const items = [
    { label: 'Occupied', swatch: 'bg-[#2f5d62]' },
    { label: 'Vacant', swatch: 'border border-dashed border-[#8a4b2f] bg-[#fbf6f1]' },
    { label: 'Department colour', swatch: 'bg-[#c9a227]' },
    { label: 'Dotted line', swatch: 'border-t-2 border-dashed border-[#8a4b2f] bg-transparent h-0 w-6 mt-2' },
    { label: 'Shared role', swatch: 'bg-[#d5e6e4]' },
    { label: 'Wide span (8+)', swatch: 'bg-[#f4d7c8]' },
  ];

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 shadow-sm no-print">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
        Legend
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px]">
            <span className={['h-2.5 w-2.5 shrink-0 rounded-sm', item.swatch].join(' ')} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
