import { z } from 'zod';
import type { ProfileLinkProvider } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCorrelationId } from '@/lib/correlation';
import { ConflictError, ValidationAppError } from '@/lib/errors';
import { fullName } from '@/lib/utils';
import type { Actor } from '@/domain/permissions/policy';

export const CreatePersonBody = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  displayName: z.string().min(1).max(160).optional(),
  preferredName: z.string().max(80).optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  profilePhotoUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  profileLinkUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  profileLinkUsername: z.string().max(80).optional().nullable(),
  profileLinkProvider: z
    .enum(['GITHUB', 'LINKEDIN', 'GRAVATAR', 'IMAGE_URL', 'MANUAL'])
    .optional()
    .nullable(),
  title: z.string().min(2).max(120).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  managerPositionId: z.string().uuid().optional().nullable(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export async function createPersonFromFields(input: {
  organisationId: string;
  actor: Actor;
  body: z.infer<typeof CreatePersonBody>;
}) {
  const body = input.body;
  const email = body.email?.trim() ? body.email.trim() : null;
  const displayName = body.displayName?.trim() || fullName(body.firstName, body.lastName);

  if (email) {
    const existing = await prisma.person.findFirst({
      where: { organisationId: input.organisationId, email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError('A person with that email already exists.');
    }
  }

  if (body.managerPositionId) {
    const manager = await prisma.position.findFirst({
      where: {
        id: body.managerPositionId,
        organisationId: input.organisationId,
        deletedAt: null,
      },
    });
    if (!manager) {
      throw new ValidationAppError('Manager position was not found.');
    }
  }

  const employeeGroup = await prisma.orgGroup.findFirst({
    where: { organisationId: input.organisationId, slug: 'employees', deletedAt: null },
  });
  const requestedGroups = new Set(body.groupIds ?? []);
  if (employeeGroup) requestedGroups.add(employeeGroup.id);

  const created = await prisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        organisationId: input.organisationId,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        displayName,
        preferredName: body.preferredName ?? null,
        email,
        phone: body.phone ?? null,
        bio: body.bio ?? null,
        profilePhotoUrl: emptyToNull(body.profilePhotoUrl),
        profileLinkUrl: emptyToNull(body.profileLinkUrl),
        profileLinkUsername: body.profileLinkUsername ?? null,
        profileLinkProvider: (body.profileLinkProvider ??
          (body.profileLinkUrl ? 'MANUAL' : null)) as ProfileLinkProvider | null,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    let positionId: string | null = null;
    if (body.title) {
      const position = await tx.position.create({
        data: {
          organisationId: input.organisationId,
          title: body.title,
          departmentId: body.departmentId ?? null,
          locationId: body.locationId ?? null,
          positionType: 'SINGLE',
          status: 'ACTIVE',
          employmentType: 'FULL_TIME',
        },
      });
      positionId = position.id;
      await tx.assignment.create({
        data: {
          organisationId: input.organisationId,
          personId: person.id,
          positionId: position.id,
          startDate: new Date(),
          isPrimary: true,
          allocationPercentage: 100,
        },
      });
      if (body.managerPositionId) {
        await tx.reportingRelationship.create({
          data: {
            organisationId: input.organisationId,
            subordinatePositionId: position.id,
            managerPositionId: body.managerPositionId,
            relationshipType: 'PRIMARY',
            isPrimary: true,
          },
        });
      }
    }

    if (requestedGroups.size > 0) {
      const groups = await tx.orgGroup.findMany({
        where: { organisationId: input.organisationId, id: { in: [...requestedGroups] }, deletedAt: null },
      });
      if (groups.length) {
        await tx.personGroupMembership.createMany({
          data: groups.map((group) => ({
            organisationId: input.organisationId,
            personId: person.id,
            groupId: group.id,
          })),
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actor.userId,
        actorType: 'USER',
        action: 'CREATE',
        entityType: 'Person',
        entityId: person.id,
        newState: {
          displayName,
          email,
          profileLinkUrl: person.profileLinkUrl,
          positionId,
        },
        source: 'LOCAL',
        correlationId: getCorrelationId(),
      },
    });

    return { person, positionId };
  });

  try {
    const { applySuggestions, suggestForPerson } = await import('@/server/services/skill-service');
    const { fetchGithubLanguages } = await import('@/server/services/profile-link-service');
    const githubLanguages =
      body.profileLinkProvider === 'GITHUB' && body.profileLinkUsername
        ? await fetchGithubLanguages(body.profileLinkUsername)
        : [];
    const suggestions = await suggestForPerson(input.organisationId, created.person.id, { githubLanguages });
    await applySuggestions({
      organisationId: input.organisationId,
      personId: created.person.id,
      suggestions,
    });
  } catch {
    // Skill allocation is best-effort and must not block creating the person.
  }

  return created;
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
