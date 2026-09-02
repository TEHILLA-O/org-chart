import type { ConnectorProvider } from '@prisma/client';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { getCorrelationId } from '@/lib/correlation';
import { decryptConnectorSecrets, encryptConnectorSecrets } from '@/lib/connector-secrets';
import { ValidationAppError } from '@/lib/errors';
import { assertWritable } from '@/demo/mode';
import { createRipplingConnector } from '@/connectors/rippling';
import type { ExternalPerson } from '@/connectors/types';
import { applyDirectoryPeople } from '@/server/services/directory-service';

const MAX_PULL = 500;

function ripplingToken(encryptedCredentials: Buffer | Uint8Array | null | undefined) {
  return decryptConnectorSecrets(encryptedCredentials).apiToken || config().RIPPLING_API_TOKEN || '';
}

async function collectPeople(organisationId: string, token: string) {
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
    if (people.length >= MAX_PULL) break;
  }
  return people;
}

export async function ensureRipplingConnector(organisationId: string) {
  const existing = await prisma.connector.findFirst({
    where: { organisationId, provider: 'RIPPLING' },
  });
  if (existing) return existing;
  return prisma.connector.create({
    data: {
      organisationId,
      provider: 'RIPPLING',
      name: 'Rippling',
      status: 'NOT_CONFIGURED',
      isReadOnly: true,
      config: { mode: 'mock' },
    },
  });
}

export async function connectRippling(organisationId: string, apiToken: string) {
  assertWritable();
  const token = apiToken.trim();
  if (token.length < 8) {
    throw new ValidationAppError('Paste a Rippling API token with the workers.read scope.');
  }

  const adapter = createRipplingConnector({
    apiToken: token,
    baseUrl: config().RIPPLING_API_BASE_URL,
  });
  const test = await adapter.testConnection({ organisationId });
  if (!test.ok) {
    throw new ValidationAppError(test.message);
  }

  const connector = await ensureRipplingConnector(organisationId);
  const updated = await prisma.connector.update({
    where: { id: connector.id },
    data: {
      name: 'Rippling',
      status: 'CONNECTED',
      isReadOnly: true,
      config: { mode: 'real' },
      encryptedCredentials: encryptConnectorSecrets({ apiToken: token }),
      lastSyncAt: new Date(),
      lastSuccessfulSyncAt: new Date(),
    },
  });

  return {
    connectorId: updated.id,
    status: updated.status,
    mode: 'real' as const,
    configured: true,
    test,
  };
}

export async function previewRipplingWorkers(organisationId: string) {
  assertWritable();
  const connector = await ensureRipplingConnector(organisationId);
  const token = ripplingToken(connector.encryptedCredentials);
  if (!token) {
    throw new ValidationAppError('Connect Rippling with an API token before pulling workers.');
  }
  const people = await collectPeople(organisationId, token);
  return {
    connector: { id: connector.id, name: connector.name, provider: connector.provider as ConnectorProvider },
    people,
  };
}

export async function syncRipplingWorkers(organisationId: string, actorId: string, apply: boolean) {
  const preview = await previewRipplingWorkers(organisationId);
  if (!apply) {
    return { preview: preview.people, connector: preview.connector };
  }

  const job = await prisma.syncJob.create({
    data: {
      organisationId,
      connectorId: preview.connector.id,
      status: 'RUNNING',
      trigger: 'MANUAL',
      mode: 'APPLY',
      correlationId: getCorrelationId(),
      startedAt: new Date(),
    },
  });

  try {
    const applied = await applyDirectoryPeople(organisationId, preview.people, 'RIPPLING');
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        createdCount: applied.created,
        updatedCount: applied.updated,
      },
    });
    await prisma.connector.update({
      where: { id: preview.connector.id },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
      },
    });
    await prisma.auditEvent.create({
      data: {
        organisationId,
        actorId,
        actorType: 'USER',
        action: 'SYNC_APPLIED',
        entityType: 'Connector',
        entityId: preview.connector.id,
        newState: { provider: 'RIPPLING', ...applied },
        source: 'RIPPLING',
        correlationId: getCorrelationId(),
      },
    });
    return { preview: preview.people, connector: preview.connector, applied };
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorCount: 1,
        error: { message: error instanceof Error ? error.message : 'Rippling sync failed.' },
      },
    });
    throw error;
  }
}
