import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { slugifySkill, suggestSkillsFromSources, type SkillSuggestion } from '@/domain/skills/extract';
import type { SkillSource } from '@prisma/client';

export async function listSkills(organisationId: string) {
  const skills = await prisma.skill.findMany({
    where: { organisationId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { people: true } } },
  });
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    personCount: skill._count.people,
  }));
}

export async function listPersonSkills(organisationId: string, personId: string) {
  const rows = await prisma.personSkill.findMany({
    where: { organisationId, personId },
    include: { skill: true },
    orderBy: { skill: { name: 'asc' } },
  });
  return rows.map((row) => ({
    id: row.id,
    skillId: row.skillId,
    name: row.skill.name,
    source: row.source,
    evidence: row.evidence,
    locked: row.locked,
  }));
}

async function ensureSkill(organisationId: string, name: string) {
  const slug = slugifySkill(name);
  return prisma.skill.upsert({
    where: { organisationId_slug: { organisationId, slug } },
    update: { name: name.trim() },
    create: { organisationId, name: name.trim(), slug },
  });
}

export async function addPersonSkill(input: {
  organisationId: string;
  personId: string;
  name: string;
  source?: SkillSource;
  evidence?: string;
  locked?: boolean;
}) {
  const person = await prisma.person.findFirst({
    where: { id: input.personId, organisationId: input.organisationId, deletedAt: null },
  });
  if (!person) throw new NotFoundError('Person not found.');
  const skill = await ensureSkill(input.organisationId, input.name);
  return prisma.personSkill.upsert({
    where: { personId_skillId: { personId: person.id, skillId: skill.id } },
    update: {
      source: input.source ?? 'MANUAL',
      evidence: input.evidence ?? '',
      locked: input.locked ?? true,
    },
    create: {
      organisationId: input.organisationId,
      personId: person.id,
      skillId: skill.id,
      source: input.source ?? 'MANUAL',
      evidence: input.evidence ?? '',
      locked: input.locked ?? true,
    },
    include: { skill: true },
  });
}

export async function removePersonSkill(organisationId: string, personId: string, skillId: string) {
  await prisma.personSkill.deleteMany({ where: { organisationId, personId, skillId } });
}

export async function suggestForPerson(
  organisationId: string,
  personId: string,
  extra?: { linkedInText?: string; githubLanguages?: string[] },
): Promise<SkillSuggestion[]> {
  const person = await prisma.person.findFirst({
    where: { id: personId, organisationId, deletedAt: null },
    include: {
      assignments: {
        where: { deletedAt: null, endDate: null, isPrimary: true },
        include: { position: true },
      },
    },
  });
  if (!person) throw new NotFoundError('Person not found.');
  return suggestSkillsFromSources({
    title: person.assignments[0]?.position.title,
    bio: person.bio,
    githubBio: person.profileLinkProvider === 'GITHUB' ? person.bio : null,
    linkedInText: extra?.linkedInText,
    githubLanguages: extra?.githubLanguages,
  });
}

export async function applySuggestions(input: {
  organisationId: string;
  personId: string;
  suggestions: SkillSuggestion[];
}) {
  const existing = await prisma.personSkill.findMany({
    where: { organisationId: input.organisationId, personId: input.personId },
    include: { skill: true },
  });
  const lockedNames = new Set(
    existing.filter((row) => row.locked || row.source === 'MANUAL').map((row) => row.skill.name.toLowerCase()),
  );

  for (const suggestion of input.suggestions) {
    if (lockedNames.has(suggestion.name.toLowerCase())) continue;
    await addPersonSkill({
      organisationId: input.organisationId,
      personId: input.personId,
      name: suggestion.name,
      source: suggestion.source,
      evidence: suggestion.evidence,
      locked: false,
    });
  }

  return listPersonSkills(input.organisationId, input.personId);
}
