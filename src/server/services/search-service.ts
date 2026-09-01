import { prisma } from '@/lib/db';
import { buildReportingGraph } from '@/domain/org/graph';
import { ancestorsToExpand } from '@/domain/chart/collapse';
import { loadOrganisationGraph } from '@/repositories/org-repository';

export interface SearchHit {
  id: string;
  kind: 'person' | 'position' | 'department' | 'location';
  title: string;
  subtitle: string;
  positionId: string | null;
}

export async function searchOrganisation(organisationId: string, query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [people, positions, departments, locations, graphInput] = await Promise.all([
    prisma.person.findMany({
      where: {
        organisationId,
        deletedAt: null,
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 12,
    }),
    prisma.position.findMany({
      where: {
        organisationId,
        deletedAt: null,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }],
      },
      take: 8,
      include: { department: true, location: true },
    }),
    prisma.department.findMany({
      where: { organisationId, deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      take: 6,
    }),
    prisma.location.findMany({
      where: { organisationId, deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      take: 6,
    }),
    loadOrganisationGraph(organisationId),
  ]);

  const graph = buildReportingGraph(graphInput);
  const hits: SearchHit[] = [];

  for (const person of people) {
    const assignment = graphInput.assignments.find((item) => item.personId === person.id && !item.endDate);
    const position = assignment ? graph.nodes.get(assignment.positionId) : undefined;
    hits.push({
      id: person.id,
      kind: 'person',
      title: person.displayName,
      subtitle: [position?.position.title, person.email].filter(Boolean).join(' · '),
      positionId: assignment?.positionId ?? null,
    });
  }

  for (const position of positions) {
    hits.push({
      id: position.id,
      kind: 'position',
      title: position.title,
      subtitle: [position.department?.name, position.location?.name].filter(Boolean).join(' · '),
      positionId: position.id,
    });
  }

  for (const department of departments) {
    const head = [...graph.nodes.values()].find((node) => node.position.departmentId === department.id);
    hits.push({
      id: department.id,
      kind: 'department',
      title: department.name,
      subtitle: 'Department',
      positionId: head?.position.id ?? null,
    });
  }

  for (const location of locations) {
    hits.push({
      id: location.id,
      kind: 'location',
      title: location.name,
      subtitle: [location.city, location.country].filter(Boolean).join(', '),
      positionId: null,
    });
  }

  return hits;
}

export { ancestorsToExpand };
