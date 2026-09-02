import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { pullSupabasePeople } from '@/connectors/supabase';
import { createRipplingConnector } from '@/connectors/rippling';
import { decryptConnectorSecrets } from '@/lib/connector-secrets';
import { getCorrelationId } from '@/lib/correlation';
import { addPersonSkill } from '@/server/services/skill-service';
import { suggestSkillsFromSources } from '@/domain/skills/extract';
import type { ExternalPerson } from '@/connectors/types';
import { isDemoMode, assertWritable } from '@/demo/mode';
import { demoDirectory } from '@/demo/northstar';
import type { ConnectorProvider } from '@prisma/client';

export async function listLiveDirectory(organisationId: string) {
  if (isDemoMode()) return demoDirectory();
  const people = await prisma.person.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      assignments: {
        where: { deletedAt: null, endDate: null, isPrimary: true },
        include: { position: { include: { department: true, location: true } } },
      },
      skills: { include: { skill: true } },
      externalIdentities: true,
    },
    take: 400,
  });
  const connectors = await prisma.connector.findMany({
    where: { organisationId },
    select: { id: true, provider: true, name: true, status: true, lastSyncAt: true, config: true },
  });
  return {
    people: people.map((person) => ({
      id: person.id,
      displayName: person.displayName,
      email: person.email,
      title: person.assignments[0]?.position.title ?? null,
      department: person.assignments[0]?.position.department?.name ?? null,
      location: person.assignments[0]?.position.location?.name ?? null,
      skills: person.skills.map((row) => ({ name: row.skill.name, source: row.source })),
      sources: person.externalIdentities.map((identity) => identity.provider),
    })),
    sources: connectors,
  };
}

export async function previewDirectorySource(organisationId: string, connectorId: string) {
  assertWritable();
  const connector = await prisma.connector.findFirst({
    where: { id: connectorId, organisationId },
  });
  if (!connector) {
    return { people: [] as ExternalPerson[], connector: null };
  }
  const stored = (connector.config ?? {}) as Record<string, unknown>;
  if (connector.provider === 'RIPPLING') {
    const token =
      decryptConnectorSecrets(connector.encryptedCredentials).apiToken || config().RIPPLING_API_TOKEN || '';
    if (!token) {
      return {
        people: [] as ExternalPerson[],
        connector: { id: connector.id, name: connector.name, provider: connector.provider },
      };
    }
    const adapter = createRipplingConnector({
      apiToken: token,
      baseUrl: config().RIPPLING_API_BASE_URL,
    });
    const people: ExternalPerson[] = [];
    for await (const person of adapter.pullPeople({
      organisationId,
      correlationId: getCorrelationId(),
    })) {
      people.push(person);
      if (people.length >= 500) break;
    }
    return { people, connector: { id: connector.id, name: connector.name, provider: connector.provider } };
  }
  if (connector.provider === 'SUPABASE') {
    const people = await pullSupabasePeople({
      organisationId,
      settings: {
        ...stored,
        url: stored.url ?? config().SUPABASE_URL,
        serviceKey: stored.serviceKey ?? config().SUPABASE_SERVICE_KEY,
        anonKey: stored.anonKey,
        table: stored.table,
      },
    });
    return { people, connector: { id: connector.id, name: connector.name, provider: connector.provider } };
  }
  return { people: [], connector: { id: connector.id, name: connector.name, provider: connector.provider } };
}

export async function applyDirectoryPeople(
  organisationId: string,
  rows: ExternalPerson[],
  provider: ConnectorProvider = 'SUPABASE',
) {
  assertWritable();
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    if (!row.email && !row.displayName) continue;
    const existing = row.email
      ? await prisma.person.findFirst({
          where: { organisationId, email: row.email.toLowerCase(), deletedAt: null },
        })
      : null;
    const names = row.displayName.split(' ');
    const person =
      existing ??
      (await prisma.person.create({
        data: {
          organisationId,
          firstName: row.firstName || names[0] || 'Imported',
          lastName: row.lastName || names.slice(1).join(' ') || names[0] || 'Person',
          displayName: row.displayName,
          email: row.email?.toLowerCase() ?? null,
          status: 'ACTIVE',
        },
      }));
    if (existing) updated += 1;
    else created += 1;

    if (row.jobTitle) {
      const hasSeat = await prisma.assignment.findFirst({
        where: { organisationId, personId: person.id, deletedAt: null, endDate: null },
      });
      if (!hasSeat) {
        const position = await prisma.position.create({
          data: {
            organisationId,
            title: row.jobTitle,
            positionType: 'SINGLE',
            status: 'ACTIVE',
            employmentType: 'FULL_TIME',
          },
        });
        await prisma.assignment.create({
          data: {
            organisationId,
            personId: person.id,
            positionId: position.id,
            isPrimary: true,
            startDate: new Date(),
          },
        });
      }
    }

    const suggestions = suggestSkillsFromSources({
      title: row.jobTitle,
      directorySkills: row.skills ?? [],
    });
    for (const suggestion of suggestions) {
      await addPersonSkill({
        organisationId,
        personId: person.id,
        name: suggestion.name,
        source: 'DIRECTORY',
        evidence: suggestion.evidence,
        locked: false,
      });
    }

    await prisma.externalIdentity.upsert({
      where: {
        organisationId_provider_entityType_externalId: {
          organisationId,
          provider,
          entityType: 'PERSON',
          externalId: row.externalId,
        },
      },
      update: { personId: person.id, lastSeenAt: new Date(), syncHash: row.email ?? row.externalId },
      create: {
        organisationId,
        provider,
        entityType: 'PERSON',
        externalId: row.externalId,
        personId: person.id,
        lastSeenAt: new Date(),
        syncHash: row.email ?? row.externalId,
      },
    });
  }
  return { created, updated, total: rows.length };
}
