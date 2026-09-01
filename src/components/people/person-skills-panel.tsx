'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PersonSkill {
  id: string;
  skillId: string;
  name: string;
  source: string;
  evidence: string;
  locked: boolean;
}

export function PersonSkillsPanel({
  personId,
  canEdit,
}: {
  personId: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [linkedInText, setLinkedInText] = useState('');

  const { data } = useQuery({
    queryKey: ['person-skills', personId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/people/${personId}/skills`);
      if (!response.ok) throw new Error('Failed to load skills');
      return (await response.json()) as { skills: PersonSkill[] };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['person-skills', personId] });
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['directory'] });
    queryClient.invalidateQueries({ queryKey: ['position'] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/people/${personId}/skills`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not add skill');
      return payload;
    },
    onSuccess: () => {
      setName('');
      toast.success('Skill added');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (skillId: string) => {
      const response = await fetch(`/api/v1/people/${personId}/skills?skillId=${skillId}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not remove skill');
    },
    onSuccess: () => {
      toast.success('Skill removed');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const allocate = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/people/${personId}/skills/allocate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkedInText: linkedInText.trim() || undefined, apply: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not allocate skills');
      return payload as { suggestions: Array<{ name: string }>; skills: PersonSkill[] };
    },
    onSuccess: (payload) => {
      toast.success(
        payload.suggestions.length
          ? `Allocated ${payload.suggestions.length} skill${payload.suggestions.length === 1 ? '' : 's'} from sources`
          : 'No matching skills in the sources provided',
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-3 rounded-2xl bg-white/8 p-4">
      <p className="text-xs font-semibold text-[var(--muted-foreground)]">Skills</p>
      <div className="flex flex-wrap gap-1.5">
        {(data?.skills ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">None yet</p>
        ) : (
          (data?.skills ?? []).map((skill) => (
            <span key={skill.skillId} className="inline-flex items-center gap-1">
              <Badge tone={skill.locked || skill.source === 'MANUAL' ? 'gold' : 'sea'}>
                {skill.name}
              </Badge>
              {canEdit ? (
                <button
                  type="button"
                  className="text-[10px] text-[var(--muted-foreground)] underline"
                  onClick={() => remove.mutate(skill.skillId)}
                >
                  Remove
                </button>
              ) : null}
            </span>
          ))
        )}
      </div>
      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[8rem] flex-1"
              placeholder="Add a skill"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim()) add.mutate();
              }}
            />
            <Button size="sm" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>
              Add
            </Button>
          </div>
          <div>
            <Label>Paste LinkedIn headline or about text</Label>
            <textarea
              className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-white/8 px-3 py-2 text-sm"
              placeholder="We do not fetch LinkedIn. Paste public text, then allocate. GitHub languages are read if a GitHub profile is linked."
              value={linkedInText}
              onChange={(event) => setLinkedInText(event.target.value)}
            />
            <Button
              className="mt-2"
              variant="outline"
              disabled={allocate.isPending}
              onClick={() => allocate.mutate()}
            >
              {allocate.isPending ? 'Allocating…' : 'Allocate from sources'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
