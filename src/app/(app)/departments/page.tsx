'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function DepartmentsPage() {
  const { data } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch('/api/v1/departments');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()) as {
        departments: Array<{
          id: string;
          name: string;
          code: string | null;
          colour: string | null;
          peopleCount: number;
          positionCount: number;
        }>;
      };
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Departments</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Open a department to see who sits in it, vacant seats, and a filtered chart view.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.departments ?? []).map((dept) => (
          <Link key={dept.id} href={`/departments/${dept.id}`} className="block">
            <Card className="h-full">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-[var(--muted-foreground)]">{dept.code}</p>
                {dept.colour ? (
                  <span
                    className="mt-0.5 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: dept.colour }}
                    aria-hidden
                  />
                ) : null}
              </div>
              <p className="mt-1 text-lg font-semibold">{dept.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {dept.peopleCount} {dept.peopleCount === 1 ? 'person' : 'people'} · {dept.positionCount}{' '}
                {dept.positionCount === 1 ? 'position' : 'positions'}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
