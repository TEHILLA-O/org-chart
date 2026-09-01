'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectItem } from '@/components/ui/select';

interface Group {
  id: string;
  name: string;
  slug: string;
  kind: string;
  colour: string | null;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'COHORT' | 'GOVERNANCE' | 'FUNCTION' | 'TEAM'>('TEAM');
  const { data } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await fetch('/api/v1/groups');
      if (!response.ok) throw new Error('Failed to load groups');
      return (await response.json()) as { groups: Group[] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, kind }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not create group');
      return payload;
    },
    onSuccess: () => {
      toast.success('Group created');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Company cohorts such as employees, the board, and operations heads. Filter the chart by any group.
        </p>
      </div>
      <Card className="space-y-3">
        <h2 className="font-semibold">New group</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Programme leads" />
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
              <SelectItem value="TEAM">Team</SelectItem>
              <SelectItem value="COHORT">Cohort</SelectItem>
              <SelectItem value="GOVERNANCE">Governance</SelectItem>
              <SelectItem value="FUNCTION">Function</SelectItem>
            </Select>
          </div>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            Create
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.groups ?? []).map((group) => (
          <Card key={group.id}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{group.name}</p>
                <p className="text-xs tracking-wide text-[var(--muted-foreground)] uppercase">{group.kind}</p>
              </div>
              <Badge tone="sea">{group.memberCount} people</Badge>
            </div>
            {group.description ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{group.description}</p>
            ) : null}
            <Link className="mt-3 inline-block text-sm underline" href={`/charts?groupIds=${group.id}`}>
              Filter chart
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
