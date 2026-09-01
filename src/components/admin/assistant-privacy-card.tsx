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
        settings: { privacyReviewComplete: boolean; modelConnected: boolean };
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
    onSuccess: (_payload, complete) => {
      toast.success(
        complete
          ? 'Privacy review marked complete. Ask still needs DEEPSEEK_API_KEY.'
          : 'Privacy review reverted. Ask stays off.',
      );
      queryClient.invalidateQueries({ queryKey: ['assistant-status'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = data?.settings.privacyReviewComplete === true;
  const modelOn = data?.settings.modelConnected === true;

  return (
    <Card>
      <h2 className="font-semibold">Assistant privacy</h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Cross-check privacy policy before sending organisation facts to DeepSeek. Lookups always stay on stored
        seats. Ask only sends names, titles, managers, groups, and skills — never emails or HR fields.
      </p>
      <p className="mt-2 text-sm font-medium">
        {complete ? 'Privacy review marked complete' : 'Privacy review outstanding'}
        {modelOn ? ' · DeepSeek key detected' : ' · no DeepSeek key'}
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
