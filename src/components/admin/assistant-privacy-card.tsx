'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AssistantPrivacyCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/assistant');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()) as {
        settings: { privacyReviewComplete: boolean; modelConnected: false };
      };
    },
  });

  const save = useMutation({
    mutationFn: async (privacyReviewComplete: boolean) => {
      const response = await fetch('/api/v1/assistant/privacy', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ privacyReviewComplete }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not update');
      return payload;
    },
    onSuccess: () => {
      toast.success('Privacy review flag updated. No language model is connected.');
      queryClient.invalidateQueries({ queryKey: ['assistant-status'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = data?.settings.privacyReviewComplete === true;

  return (
    <Card>
      <h2 className="font-semibold">Assistant privacy</h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Cross-check privacy policy before enabling generated answers. This flag does not connect an AI. Lookups stay on
        stored organisation facts.
      </p>
      <p className="mt-2 text-sm font-medium">
        {complete ? 'Privacy review marked complete' : 'Privacy review outstanding'}
      </p>
      <Button
        className="mt-3"
        variant={complete ? 'outline' : 'default'}
        onClick={() => save.mutate(!complete)}
        disabled={save.isPending}
      >
        {complete ? 'Revert to outstanding' : 'Mark policies cross-checked'}
      </Button>
    </Card>
  );
}
