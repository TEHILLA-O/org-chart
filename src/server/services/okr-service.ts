import { z } from 'zod';
import { prisma } from '@/lib/db';
import { NotFoundError, ValidationAppError } from '@/lib/errors';
import type { Actor } from '@/domain/permissions/policy';
import { isDemoMode } from '@/demo/mode';
import { demoObjectives } from '@/demo/northstar';

export const CreateObjectiveBody = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(800).optional(),
  cycleLabel: z.string().max(40).optional(),
  ownerPersonId: z.string().uuid().nullable().optional(),
  keyResults: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        unit: z.string().max(16).optional(),
        targetValue: z.number().optional(),
      }),
    )
    .max(8)
    .optional(),
});

export async function listObjectives(organisationId: string) {
  if (isDemoMode()) return demoObjectives();
  return prisma.objective.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      ownerPerson: { select: { id: true, displayName: true } },
      keyResults: true,
    },
  });
}

export async function createObjective(input: {
  organisationId: string;
  actor: Actor;
  body: z.infer<typeof CreateObjectiveBody>;
}) {
  if (isDemoMode()) {
    throw new ValidationAppError('This hosted demo is read-only until a database is connected.');
  }
  return prisma.objective.create({
    data: {
      organisationId: input.organisationId,
      title: input.body.title,
      description: input.body.description ?? '',
      cycleLabel: input.body.cycleLabel ?? '',
      ownerPersonId: input.body.ownerPersonId ?? null,
      createdById: input.actor.userId,
      keyResults: {
        create: (input.body.keyResults ?? []).map((item) => ({
          title: item.title,
          unit: item.unit ?? '%',
          targetValue: item.targetValue ?? 100,
        })),
      },
    },
    include: { ownerPerson: { select: { id: true, displayName: true } }, keyResults: true },
  });
}

export async function updateKeyResult(
  organisationId: string,
  keyResultId: string,
  currentValue: number,
) {
  if (isDemoMode()) {
    for (const objective of demoObjectives()) {
      const kr = objective.keyResults.find((item) => item.id === keyResultId);
      if (kr) {
        kr.currentValue = currentValue;
        return kr;
      }
    }
    throw new NotFoundError('Key result not found.');
  }
  const row = await prisma.keyResult.findFirst({
    where: { id: keyResultId, objective: { organisationId, deletedAt: null } },
  });
  if (!row) throw new NotFoundError('Key result not found.');
  return prisma.keyResult.update({
    where: { id: row.id },
    data: { currentValue },
  });
}
