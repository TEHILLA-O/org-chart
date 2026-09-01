'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OrganisationPage() {
  const { data } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const response = await fetch('/api/v1/organisations/current');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()) as {
        organisation: { name: string; slug: string; timezone: string };
        role: string;
      };
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{data?.organisation.name ?? 'Organisation'}</h1>
      <Card>
        <p className="text-sm text-[var(--muted-foreground)]">Slug</p>
        <p className="font-medium">{data?.organisation.slug}</p>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Timezone</p>
        <p className="font-medium">{data?.organisation.timezone}</p>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Your role</p>
        <p className="font-medium">{data?.role}</p>
        <Button asChild className="mt-4">
          <Link href="/charts">Open chart</Link>
        </Button>
      </Card>
    </div>
  );
}
