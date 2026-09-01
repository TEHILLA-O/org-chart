'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Match {
  personId: string;
  positionId: string;
  displayName: string;
  title: string;
  groups: string[];
  facts: string;
}

export default function AssistantPage() {
  const [q, setQ] = useState('');
  const { data: status } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/assistant');
      if (!response.ok) throw new Error('Failed to load assistant status');
      return (await response.json()) as {
        settings: { privacyReviewComplete: boolean; modelConnected: boolean };
      };
    },
  });

  const lookup = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Lookup failed');
      return payload as {
        privacyLocked: boolean;
        message: string;
        matches: Match[];
      };
    },
  });

  const ask = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/assistant/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Ask failed');
      return payload as { answer: string; model: string };
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const locked = !status?.settings.privacyReviewComplete;
  const modelOn = status?.settings.modelConnected === true;
  const canAsk = !locked && modelOn;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">Assistant</p>
        <h1 className="text-2xl font-semibold">Ask about the organisation</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Lookup always uses stored seats. Ask sends names, titles, managers, groups, and skills to DeepSeek — never
          emails or HR fields — after an admin marks the privacy review and a key is configured.
        </p>
      </div>

      <Card className="border-[#c9a227]/40 bg-[#fbf6e8]">
        <div className="flex items-start gap-3">
          {canAsk ? (
            <Sparkles className="mt-0.5 h-4 w-4 text-[#6a4f00]" />
          ) : (
            <Lock className="mt-0.5 h-4 w-4 text-[#6a4f00]" />
          )}
          <div>
            <p className="font-medium">
              {canAsk
                ? 'DeepSeek is connected for org-chart questions'
                : locked
                  ? 'Disabled until privacy policies are cross-checked'
                  : 'Privacy review is complete, but no DeepSeek key is set'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Admins mark the policy review on Administration. Add <code>DEEPSEEK_API_KEY</code> to the environment,
              then restart the app. The model only sees organisation facts you already store.
            </p>
            <Badge tone="gold" className="mt-2">
              {canAsk
                ? 'Review complete · model connected'
                : locked
                  ? 'Privacy review outstanding'
                  : 'Review marked complete · model not connected'}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm">Search the directory, or ask a question about reporting lines and skills.</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[16rem] flex-1"
            placeholder="Name, title, or a question such as who reports to the CTO"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') lookup.mutate();
            }}
          />
          <Button onClick={() => lookup.mutate()} disabled={lookup.isPending}>
            {lookup.isPending ? 'Looking up…' : 'Look up'}
          </Button>
          <Button
            variant="outline"
            disabled={!canAsk || ask.isPending || q.trim().length < 3}
            title={
              canAsk
                ? 'Send organisation facts to DeepSeek'
                : 'Blocked until privacy review is complete and a DeepSeek key is configured'
            }
            onClick={() => ask.mutate()}
          >
            {ask.isPending ? 'Asking…' : 'Ask assistant'}
          </Button>
        </div>
        {lookup.data ? (
          <p className="text-sm text-[var(--muted-foreground)]">{lookup.data.message}</p>
        ) : null}
        {ask.data ? (
          <div className="rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {ask.data.answer}
          </div>
        ) : null}
      </Card>

      {(lookup.data?.matches ?? []).map((match) => (
        <Card key={`${match.personId}-${match.positionId}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{match.displayName}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{match.title}</p>
            </div>
            <Link className="text-sm underline" href={`/charts?focus=${match.positionId}`}>
              Open on chart
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {match.groups.map((group) => (
              <Badge key={group}>{group}</Badge>
            ))}
          </div>
          <p className="mt-3 text-sm">{match.facts}</p>
        </Card>
      ))}
    </div>
  );
}
