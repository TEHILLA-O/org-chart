'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';

export default function LocationsPage() {
  const { data } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/locations');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()) as {
        locations: Array<{ id: string; name: string; city: string | null; country: string | null }>;
      };
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Locations</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.locations ?? []).map((location) => (
          <Card key={location.id}>
            <p className="text-lg font-semibold">{location.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {[location.city, location.country].filter(Boolean).join(', ')}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
