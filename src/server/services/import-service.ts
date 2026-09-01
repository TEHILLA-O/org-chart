import { prisma } from '@/lib/db';
import { parseCsv } from '@/lib/csv';
import { config } from '@/lib/config';
import { getCorrelationId } from '@/lib/correlation';
import { ValidationAppError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors';
import { suggestColumnMap, type ImportField } from '@/domain/import/columns';
import { mapImportRows } from '@/domain/import/validate';
import { detectPrimaryCycle } from '@/domain/org/cycle';
import { can, type Actor } from '@/domain/permissions/policy';
import { assertWritable } from '@/demo/mode';

const MAX_ROWS = 2_000;

export async function createImportJob(input: {
  organisationId: string;
  actor: Actor;
  fileName: string;
  mimeType: string;
  text: string;
}) {
  if (!can(input.actor, 'people:write')) {
    throw new ForbiddenError();
  }
  assertWritable();
  if (Buffer.byteLength(input.text, 'utf8') > config().IMPORT_MAX_BYTES) {
    throw new ValidationAppError('That file is larger than the import limit.');
  }
  if (!input.fileName.toLowerCase().endsWith('.csv') && !input.mimeType.includes('csv')) {
    throw new ValidationAppError('Upload a CSV file. Save Excel workbooks as CSV first.');
  }

  const parsed = parseCsv(input.text);
  if (parsed.headers.length === 0) {
    throw new ValidationAppError('No header row found in that CSV.');
  }
  if (parsed.rows.length === 0) {
    throw new ValidationAppError('The CSV has headers but no data rows.');
  }
  if (parsed.rows.length > MAX_ROWS) {
    throw new ValidationAppError(`CSV imports are limited to ${MAX_ROWS} rows.`);
  }

  const columnMap = suggestColumnMap(parsed.headers);
  const staged = parsed.rows.map((raw, index) => ({ rowNumber: index + 2, raw }));
  const mapped = mapImportRows(staged, columnMap);

  const job = await prisma.importJob.create({
    data: {
      organisationId: input.organisationId,
      fileName: input.fileName,
      mimeType: input.mimeType || 'text/csv',
      status: mapped.issues.length ? 'VALIDATED' : 'PREVIEWED',
      columnMap,
      createdById: input.actor.userId,
      correlationId: getCorrelationId(),
      rows: {
        create: mapped.rows.map((row) => ({
          rowNumber: row.rowNumber,
          raw: row.values,
          status: row.status,
          errors: row.errors.length ? row.errors : undefined,
        })),
      },
    },
    include: { _count: { select: { rows: true } } },
  });

  return summariseJob(job.id);
}

export async function getImportJob(organisationId: string, id: string) {
  return summariseJob(id, organisationId);
}

export async function applyImportJob(organisationId: string, actor: Actor, id: string) {
  const job = await prisma.importJob.findFirst({
    where: { id, organisationId },
    include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
  if (!job) throw new NotFoundError('Import job not found.');
  if (!can(actor, 'people:write')) {
    throw new ForbiddenError();
  }
  if (job.status === 'COMPLETED' || job.status === 'APPLYING') {
    throw new ConflictError('That import has already been applied.');
  }

  const validRows = job.rows.filter((row) => row.status === 'NEW');
  if (validRows.length === 0) {
    throw new ValidationAppError('There are no valid rows to apply.');
  }
  const existingPeople = await prisma.person.findMany({
    where: { organisationId, deletedAt: null },
    select: { id: true, email: true, displayName: true },
  });
  const peopleByEmail = new Map(
    existingPeople.filter((person) => person.email).map((person) => [person.email!.toLowerCase(), person]),
  );
  const peopleByName = new Map(existingPeople.map((person) => [person.displayName.toLowerCase(), person]));

  const departments = await prisma.department.findMany({ where: { organisationId, deletedAt: null } });
  const locations = await prisma.location.findMany({ where: { organisationId, deletedAt: null } });
  const deptByName = new Map(departments.map((dept) => [dept.name.toLowerCase(), dept]));
  const locByName = new Map(locations.map((loc) => [loc.name.toLowerCase(), loc]));

  const positions = await prisma.position.findMany({
    where: { organisationId, deletedAt: null },
    include: { assignments: { where: { deletedAt: null, endDate: null }, include: { person: true } } },
  });
  const positionByPersonId = new Map<string, string>();
  for (const position of positions) {
    for (const assignment of position.assignments) {
      positionByPersonId.set(assignment.personId, position.id);
    }
  }

  const currentEdges = await prisma.reportingRelationship.findMany({
    where: { organisationId, deletedAt: null, effectiveTo: null, isPrimary: true },
    select: { subordinatePositionId: true, managerPositionId: true },
  });
  const proposedEdges = currentEdges.map((edge) => ({ ...edge }));

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.importJob.update({ where: { id: job.id }, data: { status: 'APPLYING' } });
    const createdPositionIds: Array<{ rowId: string; personId: string; positionId: string; values: Record<ImportField, string> }> = [];

    for (const row of validRows) {
      const values = row.raw as Record<ImportField, string>;
      try {
        const email = values.email?.toLowerCase() || null;
        const displayName =
          values.displayName ||
          [values.firstName, values.lastName].filter(Boolean).join(' ') ||
          email ||
          'Imported person';
        const [firstName, ...rest] = displayName.split(' ');
        const lastName = values.lastName || rest.join(' ') || firstName || 'Unknown';

        let departmentId: string | null = null;
        if (values.department) {
          const existing = deptByName.get(values.department.toLowerCase());
          if (existing) {
            departmentId = existing.id;
          } else {
            const created = await tx.department.create({
              data: { organisationId, name: values.department },
            });
            deptByName.set(values.department.toLowerCase(), created);
            departmentId = created.id;
          }
        }

        let locationId: string | null = null;
        if (values.location) {
          const existing = locByName.get(values.location.toLowerCase());
          if (existing) {
            locationId = existing.id;
          } else {
            const created = await tx.location.create({
              data: { organisationId, name: values.location },
            });
            locByName.set(values.location.toLowerCase(), created);
            locationId = created.id;
          }
        }

        let person = email ? peopleByEmail.get(email) : peopleByName.get(displayName.toLowerCase());
        if (!person) {
          const created = await tx.person.create({
            data: {
              organisationId,
              firstName: values.firstName || firstName || 'Imported',
              lastName,
              displayName,
              email,
              employeeId: values.employeeId || null,
              status: 'ACTIVE',
            },
          });
          person = created;
          if (email) peopleByEmail.set(email, created);
          peopleByName.set(displayName.toLowerCase(), created);
          createdCount += 1;
        } else {
          updatedCount += 1;
        }

        let positionId = positionByPersonId.get(person.id);
        if (!positionId) {
          const position = await tx.position.create({
            data: {
              organisationId,
              title: values.title,
              departmentId,
              locationId,
              positionType: 'SINGLE',
              status: 'ACTIVE',
              employmentType: 'FULL_TIME',
            },
          });
          await tx.assignment.create({
            data: {
              organisationId,
              personId: person.id,
              positionId: position.id,
              isPrimary: true,
              startDate: new Date(),
            },
          });
          positionId = position.id;
          positionByPersonId.set(person.id, position.id);
        }

        createdPositionIds.push({ rowId: row.id, personId: person.id, positionId, values });
      } catch (error) {
        errorCount += 1;
        await tx.importRow.update({
          where: { id: row.id },
          data: {
            status: 'INVALID',
            errors: [error instanceof Error ? error.message : 'Row failed to apply'],
          },
        });
      }
    }

    for (const item of createdPositionIds) {
      const managerPerson =
        (item.values.managerEmail ? peopleByEmail.get(item.values.managerEmail.toLowerCase()) : undefined) ??
        (item.values.managerName ? peopleByName.get(item.values.managerName.toLowerCase()) : undefined);
      const managerPositionId = managerPerson ? positionByPersonId.get(managerPerson.id) : undefined;
      if (managerPositionId && managerPositionId !== item.positionId) {
        const idx = proposedEdges.findIndex((edge) => edge.subordinatePositionId === item.positionId);
        const next = { subordinatePositionId: item.positionId, managerPositionId };
        if (idx >= 0) proposedEdges[idx] = next;
        else proposedEdges.push(next);
      }
    }

    const cycle = detectPrimaryCycle(proposedEdges);
    if (cycle.cyclic) {
      throw new ValidationAppError(`Import would create a reporting cycle: ${cycle.path.join(' → ')}`);
    }

    for (const edge of proposedEdges) {
      const existing = await tx.reportingRelationship.findFirst({
        where: {
          organisationId,
          subordinatePositionId: edge.subordinatePositionId,
          isPrimary: true,
          deletedAt: null,
          effectiveTo: null,
        },
      });
      if (existing?.managerPositionId === edge.managerPositionId) continue;
      if (existing) {
        await tx.reportingRelationship.update({
          where: { id: existing.id },
          data: { effectiveTo: new Date(), deletedAt: new Date() },
        });
      }
      await tx.reportingRelationship.create({
        data: {
          organisationId,
          subordinatePositionId: edge.subordinatePositionId,
          managerPositionId: edge.managerPositionId,
          relationshipType: 'PRIMARY',
          isPrimary: true,
        },
      });
    }

    for (const item of createdPositionIds) {
      await tx.importRow.update({ where: { id: item.rowId }, data: { status: 'APPLIED' } });
    }

    await tx.importJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', createdCount, updatedCount, errorCount },
    });
    await tx.auditEvent.create({
      data: {
        organisationId,
        actorId: actor.userId,
        actorType: 'USER',
        action: 'IMPORT_APPLIED',
        entityType: 'ImportJob',
        entityId: job.id,
        newState: { createdCount, updatedCount, errorCount, fileName: job.fileName },
        source: 'CSV_IMPORT',
        correlationId: getCorrelationId(),
      },
    });
  });

  return summariseJob(job.id);
}

async function summariseJob(id: string, organisationId?: string) {
  const job = await prisma.importJob.findFirst({
    where: { id, ...(organisationId ? { organisationId } : {}) },
    include: { rows: { orderBy: { rowNumber: 'asc' }, take: 25 } },
  });
  if (!job) throw new NotFoundError('Import job not found.');
  const counts = await prisma.importRow.groupBy({
    by: ['status'],
    where: { importJobId: id },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(counts.map((row) => [row.status, row._count._all]));
  return {
    job: {
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      columnMap: job.columnMap,
      createdCount: job.createdCount,
      updatedCount: job.updatedCount,
      errorCount: job.errorCount,
      createdAt: job.createdAt,
    },
    preview: job.rows.map((row) => ({
      rowNumber: row.rowNumber,
      raw: row.raw,
      status: row.status,
      errors: row.errors,
    })),
    counts: {
      total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
      new: byStatus.NEW ?? 0,
      invalid: byStatus.INVALID ?? 0,
      duplicate: byStatus.DUPLICATE ?? 0,
      applied: byStatus.APPLIED ?? 0,
    },
  };
}
