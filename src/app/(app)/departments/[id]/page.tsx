'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { initials } from '@/lib/utils';

interface DepartmentDetail {
  department: { id: string; name: string; code: string | null; colour: string | null };
  head: { positionId: string; title: string; personName: string } | null;
  people: Array<{
    personId: string;
    displayName: string;
    email: string | null;
    profilePhotoUrl: string | null;
    holidayRemainingDays: number | null;
    positionId: string;
    title: string;
    location: string | null;
    isPrimary: boolean;
  }>;
  vacant: Array<{ positionId: string; title: string; location: string | null }>;
  totals: { positions: number; people: number; vacant: number };
}

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['department', params.id],
    enabled: Boolean(params.id),
    queryFn: async () => {
      const response = await fetch(`/api/v1/departments/${params.id}`);
      if (!response.ok) throw new Error('Department not found');
      return (await response.json()) as DepartmentDetail;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-[var(--muted-foreground)]">Loading department…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm">That department could not be found.</p>
        <Link href="/departments" className="text-sm underline">
          Back to departments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/departments" className="text-xs text-[var(--muted-foreground)] underline">
            Departments
          </Link>
          <div className="mt-1 flex items-center gap-2">
            {data.department.colour ? (
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: data.department.colour }}
                aria-hidden
              />
            ) : null}
            <h1 className="text-2xl font-semibold">{data.department.name}</h1>
            {data.department.code ? <Badge>{data.department.code}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {data.totals.people} {data.totals.people === 1 ? 'person' : 'people'} · {data.totals.positions}{' '}
            positions · {data.totals.vacant} vacant
            {data.head ? ` · Head: ${data.head.personName}` : ''}
          </p>
        </div>
        <Link href={`/charts?departmentIds=${data.department.id}`}>
          <Button>Open on chart</Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {data.people.map((person) => (
          <Card key={`${person.personId}-${person.positionId}`}>
            <div className="flex items-center gap-3">
              {person.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.profilePhotoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold">
                  {initials(person.displayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/charts?focus=${person.positionId}`} className="font-semibold hover:underline">
                  {person.displayName}
                </Link>
                <p className="truncate text-sm text-[var(--muted-foreground)]">
                  {person.title}
                  {person.location ? ` · ${person.location}` : ''}
                  {person.email ? ` · ${person.email}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {!person.isPrimary ? <Badge>Secondary</Badge> : null}
                {person.holidayRemainingDays != null ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {person.holidayRemainingDays} days leave left
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data.vacant.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Vacant seats</h2>
          {data.vacant.map((seat) => (
            <Card key={seat.positionId}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{seat.title}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{seat.location ?? 'No location'}</p>
                </div>
                <Badge tone="vacant">Vacant</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
