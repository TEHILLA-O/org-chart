'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DiagramSource {
  id: string;
  name: string;
  description: string;
  href: string;
  count: number | null;
}

export default function DiagramsPage() {
  const { data } = useQuery({
    queryKey: ['diagrams'],
    queryFn: async () => {
      const response = await fetch('/api/v1/diagrams');
      if (!response.ok) throw new Error('Failed to load diagram sources');
      return (await response.json()) as { sources: DiagramSource[] };
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">Diagrams</p>
        <h1 className="text-2xl font-semibold">Charts from many sources</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Each source feeds the same workspace. Open the live org chart, import a CSV, or pull a directory connector
          — the seats stay in Postgres.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.sources ?? []).map((source) => (
          <Card key={source.id} className="flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{source.name}</p>
                {source.count != null ? <Badge tone="sea">{source.count}</Badge> : <Badge>Connector</Badge>}
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{source.description}</p>
            </div>
            <Link className="text-sm font-medium underline" href={source.href}>
              Open
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
