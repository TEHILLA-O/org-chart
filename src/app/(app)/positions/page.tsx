'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PositionsPage() {
  const { data } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/positions');
      if (!response.ok) throw new Error('Failed to load positions');
      return (await response.json()) as {
        positions: Array<{
          id: string;
          title: string;
          status: string;
          positionType: string;
          department: { name: string } | null;
          location: { name: string } | null;
          assignments: Array<{ person: { displayName: string } }>;
        }>;
      };
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Positions</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs tracking-wide uppercase">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Holder</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {(data?.positions ?? []).map((position) => (
              <tr key={position.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2">
                  <Link className="font-medium underline" href={`/charts?focus=${position.id}`}>
                    {position.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {position.assignments.length === 0 ? (
                    <Badge tone="vacant">Vacant</Badge>
                  ) : (
                    position.assignments.map((item) => item.person.displayName).join(', ')
                  )}
                </td>
                <td className="px-4 py-2">{position.department?.name ?? '—'}</td>
                <td className="px-4 py-2">{position.location?.name ?? '—'}</td>
                <td className="px-4 py-2">{position.positionType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
