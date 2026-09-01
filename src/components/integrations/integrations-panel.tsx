'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConnectorRow {
  id: string;
  provider: string;
  name: string;
  status: string;
  isReadOnly: boolean;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  mode: 'mock' | 'real';
  identityCount: number;
  recentJobs: Array<{
    id: string;
    status: string;
    mode: string;
    createdCount: number;
    updatedCount: number;
    finishedAt: string | null;
  }>;
}

interface SourceHealth {
  connectorId: string;
  provider: string;
  name: string;
  status: string;
  mode: 'mock' | 'real';
  identityCount: number;
  test: { ok: boolean; message: string };
}

export function IntegrationsPanel({ canRefresh }: { canRefresh: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['connectors'],
    queryFn: async () => {
      const response = await fetch('/api/v1/connectors');
      if (!response.ok) throw new Error('Failed to load connectors');
      return (await response.json()) as { connectors: ConnectorRow[] };
    },
  });

  const check = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/connectors/check', {
        method: canRefresh ? 'POST' : 'GET',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Live check failed');
      return payload as {
        checkedAt: string;
        liveCount: number;
        total: number;
        sources: SourceHealth[];
      };
    },
    onSuccess: (payload) => {
      toast.success(`Checked ${payload.total} sources · ${payload.liveCount} live`);
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const healthById = new Map((check.data?.sources ?? []).map((source) => [source.connectorId, source]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Read-only connectors. Local development uses Microsoft and Rippling mocks — no tenant
            credentials required. Secrets are never returned to the client.
          </p>
        </div>
        <Button onClick={() => check.mutate()} disabled={check.isPending}>
          {check.isPending ? 'Checking…' : 'Check live sources'}
        </Button>
      </div>

      {check.data ? (
        <Card>
          <p className="text-sm font-medium">
            {check.data.liveCount} of {check.data.total} sources reachable
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Last checked {new Date(check.data.checkedAt).toLocaleString('en-GB')}
            {canRefresh ? ' · mock Rippling leave balances refreshed' : ''}
          </p>
        </Card>
      ) : null}

      {(data?.connectors ?? []).map((connector) => {
        const health = healthById.get(connector.id);
        const live = health?.test.ok ?? connector.status === 'CONNECTED';
        return (
          <Card key={connector.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{connector.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {connector.provider} · {connector.mode} · {connector.isReadOnly ? 'read only' : 'writable'}
                </p>
              </div>
              <Badge tone={live ? 'sea' : 'vacant'}>{health?.status ?? connector.status}</Badge>
            </div>
            <p className="mt-2 text-sm">
              {connector.identityCount} linked {connector.identityCount === 1 ? 'identity' : 'identities'}
              {connector.lastSyncAt
                ? ` · last sync ${new Date(connector.lastSyncAt).toLocaleString('en-GB')}`
                : ''}
            </p>
            {health ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{health.test.message}</p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm">
              {connector.recentJobs.map((job) => (
                <li key={job.id}>
                  {job.status} · {job.mode} · created {job.createdCount} / updated {job.updatedCount}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
