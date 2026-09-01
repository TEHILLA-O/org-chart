'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShareRow {
  id: string;
  allowEmbed: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
  active: boolean;
}

export function ShareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [allowEmbed, setAllowEmbed] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [created, setCreated] = useState<{ url: string; embedUrl: string; token: string } | null>(null);

  const { data } = useQuery({
    queryKey: ['shares'],
    enabled: open,
    queryFn: async () => {
      const response = await fetch('/api/v1/shares');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not load share links');
      return payload as { shares: ShareRow[] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          allowEmbed,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not create link');
      return payload as { url: string; embedUrl: string; token: string };
    },
    onSuccess: (payload) => {
      setCreated(payload);
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      toast.success('Share link created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/shares/${id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not revoke link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      toast.success('Link revoked');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCreated(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[min(34rem,calc(100%-2rem))]">
        <DialogTitle>Share this chart</DialogTitle>
        <DialogDescription>
          Creates a view-only link. Names, titles and photos are included; emails and HR fields stay
          private unless you later allow specific fields.
        </DialogDescription>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowEmbed}
              onChange={(event) => setAllowEmbed(event.target.checked)}
            />
            Allow iframe embed
          </label>
          <div>
            <Label htmlFor="share-expiry">Expires in days (optional)</Label>
            <Input
              id="share-expiry"
              className="mt-1"
              inputMode="numeric"
              placeholder="Leave blank for no expiry"
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create link'}
          </Button>
        </div>

        {created ? (
          <div className="mt-4 space-y-2 rounded-2xl bg-[var(--muted)] p-3 text-sm">
            <p className="font-medium">Save this URL — the token is shown only once.</p>
            <div className="flex gap-2">
              <Input readOnly value={created.url} />
              <Button variant="outline" onClick={() => copy(created.url, 'Share URL')}>
                Copy
              </Button>
            </div>
            {allowEmbed ? (
              <div className="flex gap-2">
                <Input readOnly value={created.embedUrl} />
                <Button variant="outline" onClick={() => copy(created.embedUrl, 'Embed URL')}>
                  Embed
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {data?.shares?.length ? (
          <ul className="mt-4 max-h-48 space-y-2 overflow-auto text-sm">
            {data.shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-2">
                <span className="text-[var(--muted-foreground)]">
                  {new Date(share.createdAt).toLocaleDateString()} · {share.viewCount} views
                  {share.allowEmbed ? ' · embed' : ''}
                  {share.active ? '' : ' · revoked'}
                </span>
                {share.active ? (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(share.id)}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
