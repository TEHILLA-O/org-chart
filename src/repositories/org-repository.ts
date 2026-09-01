import { prisma } from '@/lib/db';
import type { ChartFilter } from '@/domain/org/types';
import {
  type AssignmentSnapshot,
  type PersonSnapshot,
  type PositionSnapshot,
  type RelationshipSnapshot,
} from '@/domain/org/types';

const notDeleted = { deletedAt: null };

export async function loadOrganisationGraph(organisationId: string) {
  const [positions, people, assignments, relationships, departments, locations, memberships] = await Promise.all([
    prisma.position.findMany({
      where: { organisationId, ...notDeleted },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    }),
    prisma.person.findMany({
      where: { organisationId, ...notDeleted },
    }),
    prisma.assignment.findMany({
      where: { organisationId, ...notDeleted },
    }),
    prisma.reportingRelationship.findMany({
      where: { organisationId, ...notDeleted, effectiveTo: null },
    }),
    prisma.department.findMany({
      where: { organisationId, ...notDeleted },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({
      where: { organisationId, ...notDeleted },
      orderBy: { name: 'asc' },
    }),
    prisma.personGroupMembership.findMany({
      where: { organisationId },
      select: { personId: true, groupId: true },
    }),
  ]);

  const groupIdsByPerson = new Map<string, string[]>();
  for (const row of memberships) {
    const list = groupIdsByPerson.get(row.personId) ?? [];
    list.push(row.groupId);
    groupIdsByPerson.set(row.personId, list);
  }

  return {
    positions: positions.map(toPositionSnapshot),
    people: people.map((person) => toPersonSnapshot(person, groupIdsByPerson.get(person.id) ?? [])),
    assignments: assignments.map(toAssignmentSnapshot),
    relationships: relationships.map(toRelationshipSnapshot),
    departments,
    locations,
  };
}

export async function loadDefaultChart(organisationId: string) {
  const chart = await prisma.chart.findFirst({
    where: { organisationId, isDefault: true, ...notDeleted },
    include: { configuration: true },
  });
  return chart;
}

export async function listAuditEvents(organisationId: string, take = 25) {
  return prisma.auditEvent.findMany({
    where: { organisationId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: { name: true, email: true } } },
  });
}

export async function loadDashboardMetrics(organisationId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [people, positions, departments, locations, assignments, changesThisMonth, lastSync, recentAudit] =
    await Promise.all([
      prisma.person.count({ where: { organisationId, deletedAt: null, status: 'ACTIVE' } }),
      prisma.position.count({ where: { organisationId, deletedAt: null } }),
      prisma.department.count({ where: { organisationId, deletedAt: null } }),
      prisma.location.count({ where: { organisationId, deletedAt: null } }),
      prisma.assignment.findMany({
        where: { organisationId, deletedAt: null, endDate: null },
        select: { positionId: true },
      }),
      prisma.auditEvent.count({
        where: { organisationId, createdAt: { gte: monthStart } },
      }),
      prisma.syncJob.findFirst({
        where: { organisationId },
        orderBy: { createdAt: 'desc' },
        include: { connector: true },
      }),
      listAuditEvents(organisationId, 8),
    ]);

  const occupied = new Set(assignments.map((row) => row.positionId));
  const vacant = await prisma.position.count({
    where: {
      organisationId,
      deletedAt: null,
      id: { notIn: occupied.size > 0 ? [...occupied] : ['00000000-0000-0000-0000-000000000000'] },
    },
  });

  const lastSuccessfulSync = await prisma.syncJob.findFirst({
    where: { organisationId, status: { in: ['COMPLETED', 'COMPLETED_WITH_WARNINGS'] } },
    orderBy: { finishedAt: 'desc' },
  });

  const connector = await prisma.connector.findFirst({
    where: { organisationId },
    orderBy: { createdAt: 'asc' },
  });

  return {
    people,
    positions,
    vacantPositions: vacant,
    departments,
    locations,
    changesThisMonth,
    lastSync,
    lastSuccessfulSync,
    connector,
    recentAudit,
  };
}

function toPersonSnapshot(
  person: {
    id: string;
    displayName: string;
    preferredName: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    profilePhotoUrl: string | null;
    status: PersonSnapshot['status'];
  },
  groupIds: string[] = [],
): PersonSnapshot {
  return {
    id: person.id,
    displayName: person.displayName,
    preferredName: person.preferredName,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    phone: person.phone,
    profilePhotoUrl: person.profilePhotoUrl,
    status: person.status,
    groupIds,
  };
}

function toPositionSnapshot(position: {
  id: string;
  title: string;
  code: string | null;
  departmentId: string | null;
  locationId: string | null;
  positionType: PositionSnapshot['positionType'];
  employmentType: PositionSnapshot['employmentType'];
  status: PositionSnapshot['status'];
  sortOrder: number | null;
}): PositionSnapshot {
  return {
    id: position.id,
    title: position.title,
    code: position.code,
    departmentId: position.departmentId,
    locationId: position.locationId,
    positionType: position.positionType,
    employmentType: position.employmentType,
    status: position.status,
    sortOrder: position.sortOrder,
  };
}

function toAssignmentSnapshot(assignment: {
  id: string;
  personId: string;
  positionId: string;
  isPrimary: boolean;
  allocationPercentage: number;
  assignmentType: string;
  startDate: Date;
  endDate: Date | null;
}): AssignmentSnapshot {
  return {
    id: assignment.id,
    personId: assignment.personId,
    positionId: assignment.positionId,
    isPrimary: assignment.isPrimary,
    allocationPercentage: assignment.allocationPercentage,
    assignmentType: assignment.assignmentType,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
  };
}

function toRelationshipSnapshot(rel: {
  id: string;
  subordinatePositionId: string;
  managerPositionId: string;
  relationshipType: RelationshipSnapshot['relationshipType'];
  isPrimary: boolean;
}): RelationshipSnapshot {
  return {
    id: rel.id,
    subordinatePositionId: rel.subordinatePositionId,
    managerPositionId: rel.managerPositionId,
    relationshipType: rel.relationshipType,
    isPrimary: rel.isPrimary,
  };
}

export async function loadOrgGroups(organisationId: string) {
  return prisma.orgGroup.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function parseFilters(searchParams: URLSearchParams): ChartFilter {
  const csv = (key: string) => searchParams.get(key)?.split(',').filter(Boolean);
  return {
    departmentIds: csv('departmentIds'),
    locationIds: csv('locationIds'),
    personStatuses: csv('personStatuses') as ChartFilter['personStatuses'],
    positionStatuses: csv('positionStatuses') as ChartFilter['positionStatuses'],
    personId: searchParams.get('personId') ?? undefined,
    managerPositionId: searchParams.get('managerPositionId') ?? undefined,
    groupIds: csv('groupIds'),
  };
}
