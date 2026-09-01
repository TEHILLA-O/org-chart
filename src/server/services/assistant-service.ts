import { prisma } from '@/lib/db';
import { buildReportingGraph } from '@/domain/org/graph';
import { loadOrganisationGraph, loadOrgGroups } from '@/repositories/org-repository';

export interface AssistantSettings {
  privacyReviewComplete: boolean;
  modelConnected: false;
}

export function readAssistantSettings(settings: unknown): AssistantSettings {
  const record = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {};
  const assistant =
    record.assistant && typeof record.assistant === 'object'
      ? (record.assistant as Record<string, unknown>)
      : {};
  return {
    privacyReviewComplete: assistant.privacyReviewComplete === true,
    modelConnected: false,
  };
}

export async function lookupEmployeeBrief(organisationId: string, query: string) {
  const [graphInput, groups, organisation] = await Promise.all([
    loadOrganisationGraph(organisationId),
    loadOrgGroups(organisationId),
    prisma.organisation.findFirst({ where: { id: organisationId } }),
  ]);
  const graph = buildReportingGraph(graphInput);
  const settings = readAssistantSettings(organisation?.settings);
  const needle = query.trim().toLowerCase();
  const groupName = new Map(groups.map((group) => [group.id, group.name]));

  const matches: Array<{
    personId: string;
    positionId: string;
    displayName: string;
    title: string;
    departmentId: string | null;
    groups: string[];
    facts: string;
  }> = [];

  for (const node of graph.nodes.values()) {
    for (const occupant of node.occupants) {
      const haystack = [
        occupant.person.displayName,
        occupant.person.email,
        node.position.title,
      ]
        .join(' ')
        .toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const manager = node.primaryManagerId ? graph.nodes.get(node.primaryManagerId) : null;
      const groupNames = (occupant.person.groupIds ?? [])
        .map((id) => groupName.get(id))
        .filter((name): name is string => Boolean(name));
      const facts = [
        `${occupant.person.displayName} holds ${node.position.title}.`,
        manager
          ? `Reports to ${manager.occupants[0]?.person.displayName ?? 'a vacant seat'} (${manager.position.title}).`
          : 'This is a root seat on the live chart.',
        groupNames.length ? `Company groups: ${groupNames.join(', ')}.` : null,
        `${node.directReportIds.length} direct reports.`,
      ]
        .filter(Boolean)
        .join(' ');

      matches.push({
        personId: occupant.person.id,
        positionId: node.position.id,
        displayName: occupant.person.displayName,
        title: node.position.title,
        departmentId: node.position.departmentId,
        groups: groupNames,
        facts,
      });
    }
  }

  matches.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    settings,
    privacyLocked: !settings.privacyReviewComplete,
    modelConnected: false,
    message: settings.privacyReviewComplete
      ? 'Privacy review is marked complete, but no language model is connected. Showing stored organisation facts only.'
      : 'Assistant answers stay disabled until privacy policies are cross-checked. You can still look people up from the live org chart.',
    matches: matches.slice(0, 20),
  };
}

export async function setPrivacyReview(organisationId: string, complete: boolean) {
  const organisation = await prisma.organisation.findFirst({ where: { id: organisationId } });
  const current =
    organisation?.settings && typeof organisation.settings === 'object'
      ? (organisation.settings as Record<string, unknown>)
      : {};
  const next = {
    ...current,
    assistant: {
      privacyReviewComplete: complete,
      modelConnected: false,
    },
  };
  await prisma.organisation.update({
    where: { id: organisationId },
    data: { settings: next },
  });
  return readAssistantSettings(next);
}
