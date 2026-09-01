import { prisma } from '@/lib/db';
import { applyCollapseState, ancestorsToExpand } from '@/domain/chart/collapse';
import { applyFilters } from '@/domain/chart/filters';
import { projectToChartModel } from '@/domain/chart/project';
import { buildReportingGraph, reportingChain, requirePosition } from '@/domain/org/graph';
import { computeOrgHealth } from '@/domain/org/health';
import { tenureLabel } from '@/domain/hr/leave';
import { redactRecord } from '@/domain/privacy/visibility';
import type { Actor } from '@/domain/permissions/policy';
import type { ChartFilter } from '@/domain/org/types';
import { loadDefaultChart, loadOrgGroups, loadOrganisationGraph } from '@/repositories/org-repository';
import { NotFoundError } from '@/lib/errors';

export async function getChartPayload(options: {
  organisationId: string;
  collapsedPositionIds?: string[];
  filters?: ChartFilter;
  focusPositionId?: string;
  showSecondaryLines?: boolean;
}) {
  const [graphInput, chart, groups] = await Promise.all([
    loadOrganisationGraph(options.organisationId),
    loadDefaultChart(options.organisationId),
    loadOrgGroups(options.organisationId),
  ]);

  const graph = buildReportingGraph(graphInput);
  let collapsed = new Set(options.collapsedPositionIds ?? chart?.configuration?.collapsedPositionIds ?? []);

  if (options.focusPositionId) {
    for (const id of ancestorsToExpand(graph, options.focusPositionId, collapsed)) {
      collapsed.delete(id);
    }
  }

  const filtered = applyFilters(graph, options.filters ?? {});
  const rendered = applyCollapseState(graph, collapsed, filtered);
  const projected = projectToChartModel(
    graph,
    rendered,
    collapsed,
    options.showSecondaryLines ?? chart?.configuration?.showSecondaryLines ?? true,
    {
      departments: new Map(
        graphInput.departments.map((dept) => [dept.id, { name: dept.name, colour: dept.colour }]),
      ),
      locations: new Map(graphInput.locations.map((location) => [location.id, { name: location.name }])),
      groups: new Map(groups.map((group) => [group.id, { name: group.name }])),
    },
  );

  return {
    chart,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      kind: group.kind,
      colour: group.colour,
    })),
    departments: graphInput.departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      colour: dept.colour,
    })),
    locations: graphInput.locations.map((location) => ({
      id: location.id,
      name: location.name,
    })),
    graph: {
      roots: graph.roots,
      descendantCounts: Object.fromEntries(graph.descendantCounts),
    },
    nodes: projected.nodes,
    edges: projected.edges,
    collapsedPositionIds: [...collapsed],
    totals: {
      positions: graph.nodes.size,
      rendered: rendered.size,
      vacant: [...graph.nodes.values()].filter((node) => node.isVacant).length,
    },
  };
}

export async function getPositionDetails(organisationId: string, positionId: string, actor: Actor | null = null) {
  const [graphInput, groups] = await Promise.all([
    loadOrganisationGraph(organisationId),
    loadOrgGroups(organisationId),
  ]);
  const graph = buildReportingGraph(graphInput);
  const node = requirePosition(graph, positionId);

  const manager = node.primaryManagerId ? graph.nodes.get(node.primaryManagerId) : null;
  const secondaryManagers = node.secondaryManagerIds
    .map((id) => graph.nodes.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const directReports = node.directReportIds
    .map((id) => graph.nodes.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const occupant = node.occupants[0];
  const otherPositions = occupant
    ? [...graph.nodes.values()]
        .filter((candidate) =>
          candidate.occupants.some((item) => item.person.id === occupant.person.id && candidate.position.id !== positionId),
        )
        .map((candidate) => ({
          positionId: candidate.position.id,
          title: candidate.position.title,
        }))
    : [];

  const identities = await prisma.externalIdentity.findMany({
    where: {
      organisationId,
      OR: [{ positionId }, ...(occupant ? [{ personId: occupant.person.id }] : [])],
    },
  });

  const personRecord = occupant
    ? await prisma.person.findFirst({
        where: { id: occupant.person.id, organisationId, deletedAt: null },
      })
    : null;

  const groupById = new Map(groups.map((group) => [group.id, group]));

  const hrRaw = personRecord
    ? {
        employeeId: personRecord.employeeId,
        startDate: personRecord.startDate,
        tenure: tenureLabel(personRecord.startDate),
        holidayAllowanceDays: personRecord.holidayAllowanceDays,
        holidayRemainingDays: personRecord.holidayRemainingDays,
        costCentre: personRecord.costCentre,
        workingPattern: personRecord.workingPattern,
        ftePercent: personRecord.ftePercent,
        nextReviewDate: personRecord.nextReviewDate,
        probationEndDate: personRecord.probationEndDate,
        contractEndDate: personRecord.contractEndDate,
        noticePeriodDays: personRecord.noticePeriodDays,
        employmentType: node.position.employmentType,
        allocationPercentage: occupant?.assignment.allocationPercentage ?? null,
      }
    : null;

  return {
    position: node.position,
    isVacant: node.isVacant,
    occupants: node.occupants.map((item) => item.person),
    profile: personRecord
      ? {
          bio: personRecord.bio,
          profileLinkUrl: personRecord.profileLinkUrl,
          profileLinkUsername: personRecord.profileLinkUsername,
          profileLinkProvider: personRecord.profileLinkProvider,
          profilePhotoUrl: personRecord.profilePhotoUrl,
        }
      : null,
    groups: (occupant?.person.groupIds ?? [])
      .map((id) => groupById.get(id))
      .filter((group): group is NonNullable<typeof group> => Boolean(group))
      .map((group) => ({ id: group.id, name: group.name, kind: group.kind })),
    department: graphInput.departments.find((dept) => dept.id === node.position.departmentId) ?? null,
    location: graphInput.locations.find((loc) => loc.id === node.position.locationId) ?? null,
    manager: manager
      ? {
          positionId: manager.position.id,
          title: manager.position.title,
          personName: manager.occupants[0]?.person.displayName ?? 'Vacant',
        }
      : null,
    secondaryManagers: secondaryManagers.map((item) => ({
      positionId: item.position.id,
      title: item.position.title,
      personName: item.occupants[0]?.person.displayName ?? 'Vacant',
    })),
    directReports: directReports.map((item) => ({
      positionId: item.position.id,
      title: item.position.title,
      personName: item.occupants[0]?.person.displayName ?? 'Vacant',
      isVacant: item.isVacant,
    })),
    downstreamCount: graph.descendantCounts.get(positionId) ?? 0,
    reportingChain: reportingChain(graph, positionId).map((id) => {
      const chainNode = graph.nodes.get(id)!;
      return {
        positionId: id,
        title: chainNode.position.title,
        personName: chainNode.occupants[0]?.person.displayName ?? 'Vacant',
      };
    }),
    otherPositions,
    hr: hrRaw ? redactRecord(hrRaw, { actor }) : null,
    provenance: identities.map((identity) => ({
      provider: identity.provider,
      externalId: identity.externalId,
      entityType: identity.entityType,
      lastSeenAt: identity.lastSeenAt,
    })),
  };
}

export async function requireDefaultChart(organisationId: string) {
  const chart = await loadDefaultChart(organisationId);
  if (!chart) {
    throw new NotFoundError('No default chart is configured for this organisation.');
  }
  return chart;
}

export async function getOrgHealth(organisationId: string) {
  const graphInput = await loadOrganisationGraph(organisationId);
  return computeOrgHealth(buildReportingGraph(graphInput));
}
