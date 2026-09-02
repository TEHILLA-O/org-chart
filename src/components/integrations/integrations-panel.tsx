'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConnectorRow {
  id: string;
  provider: string;
  name: string;
  status: string;
  isReadOnly: boolean;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  mode: 'mock' | 'real';
  hasCredentials?: boolean;
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

interface PreviewPerson {
  externalId: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  department?: string;
}

export function IntegrationsPanel({ canRefresh }: { canRefresh: boolean }) {
  const queryClient = useQueryClient();
  const [ripplingToken, setRipplingToken] = useState('');
  const [ripplingPreview, setRipplingPreview] = useState<PreviewPerson[] | null>(null);

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

  const connectRippling = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/connectors/rippling', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiToken: ripplingToken }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not connect Rippling');
      return payload as { configured: boolean; test: { ok: boolean; message: string } };
    },
    onSuccess: (payload) => {
      setRipplingToken('');
      toast.success(payload.test.message);
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pullRippling = useMutation({
    mutationFn: async (apply: boolean) => {
      const response = await fetch('/api/v1/connectors/rippling/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apply }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Rippling pull failed');
      return payload as {
        preview: PreviewPerson[];
        applied?: { created: number; updated: number; total: number };
      };
    },
    onSuccess: (payload, apply) => {
      setRipplingPreview(payload.preview);
      if (apply && payload.applied) {
        toast.success(
          `Pulled ${payload.applied.total} Rippling workers · ${payload.applied.created} created · ${payload.applied.updated} updated`,
        );
        queryClient.invalidateQueries({ queryKey: ['connectors'] });
        queryClient.invalidateQueries({ queryKey: ['directory'] });
        queryClient.invalidateQueries({ queryKey: ['people'] });
        queryClient.invalidateQueries({ queryKey: ['chart-graph'] });
      } else {
        toast.success(`Previewed ${payload.preview.length} Rippling workers`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const healthById = new Map((check.data?.sources ?? []).map((source) => [source.connectorId, source]));
  const rippling = (data?.connectors ?? []).find((connector) => connector.provider === 'RIPPLING');
  const ripplingReady = rippling?.hasCredentials === true || rippling?.mode === 'real';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Read-only connectors. Connect Rippling with an API token to pull workers into the live directory.
            Secrets are never returned to the browser after save.
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
            {canRefresh ? ' · mock Rippling leave balances refreshed when still in mock mode' : ''}
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">Rippling</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Pulls active workers (name, work email, title, department, manager) over REST. Needs{' '}
              <code>workers.read</code>. Personal emails and compensation are not stored.
            </p>
          </div>
          <Badge tone={ripplingReady ? 'sea' : 'vacant'}>
            {ripplingReady ? 'Connected' : 'Not configured'}
          </Badge>
        </div>
        <p className="text-sm">
          {rippling
            ? `${rippling.identityCount} linked ${rippling.identityCount === 1 ? 'identity' : 'identities'}`
            : 'No Rippling connector yet'}
          {rippling?.lastSyncAt
            ? ` · last sync ${new Date(rippling.lastSyncAt).toLocaleString('en-GB')}`
            : ''}
        </p>
        {canRefresh ? (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="min-w-[16rem] flex-1"
              type="password"
              autoComplete="off"
              placeholder={ripplingReady ? 'Replace API token' : 'Rippling API token'}
              value={ripplingToken}
              onChange={(event) => setRipplingToken(event.target.value)}
            />
            <Button
              variant="outline"
              disabled={connectRippling.isPending || ripplingToken.trim().length < 8}
              onClick={() => connectRippling.mutate()}
            >
              {connectRippling.isPending ? 'Connecting…' : 'Save and test'}
            </Button>
            <Button
              variant="outline"
              disabled={!ripplingReady || pullRippling.isPending}
              onClick={() => pullRippling.mutate(false)}
            >
              Preview workers
            </Button>
            <Button disabled={!ripplingReady || pullRippling.isPending} onClick={() => pullRippling.mutate(true)}>
              {pullRippling.isPending ? 'Pulling…' : 'Pull into directory'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Admins connect Rippling and pull workers.</p>
        )}
        {ripplingPreview ? (
          <ul className="space-y-1 text-sm">
            {ripplingPreview.length === 0 ? <li>No active workers returned.</li> : null}
            {ripplingPreview.slice(0, 20).map((person) => (
              <li key={person.externalId}>
                {person.displayName}
                {person.jobTitle ? ` · ${person.jobTitle}` : ''}
                {person.department ? ` · ${person.department}` : ''}
              </li>
            ))}
            {ripplingPreview.length > 20 ? (
              <li className="text-[var(--muted-foreground)]">+{ripplingPreview.length - 20} more</li>
            ) : null}
          </ul>
        ) : null}
      </Card>

      {(data?.connectors ?? [])
        .filter((connector) => connector.provider !== 'RIPPLING')
        .map((connector) => {
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
