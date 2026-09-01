import { prisma } from '@/lib/db';
import { buildReportingGraph } from '@/domain/org/graph';
import { loadOrganisationGraph, loadOrgGroups } from '@/repositories/org-repository';
import { completeOrgChat, isDeepSeekConfigured } from '@/server/llm/deepseek';
import { ForbiddenError, ValidationAppError } from '@/lib/errors';
import { isDemoMode } from '@/demo/mode';
import { demoOrganisation, demoPeople } from '@/demo/northstar';

export interface AssistantSettings {
  privacyReviewComplete: boolean;
  modelConnected: boolean;
}

export function readAssistantSettings(settings: unknown): AssistantSettings {
  const record = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {};
  const assistant =
    record.assistant && typeof record.assistant === 'object'
      ? (record.assistant as Record<string, unknown>)
      : {};
  return {
    privacyReviewComplete: assistant.privacyReviewComplete === true,
    modelConnected: isDeepSeekConfigured(),
  };
}

async function organisationFacts(organisationId: string, limit = 80) {
  const [graphInput, groups, skills] = await Promise.all([
    loadOrganisationGraph(organisationId),
    loadOrgGroups(organisationId),
    isDemoMode()
      ? Promise.resolve(
          demoPeople.flatMap((person) =>
            person.skills.map((name) => ({
              personId: person.id,
              skill: { name },
              person: { id: person.id, displayName: person.displayName },
            })),
          ),
        )
      : prisma.personSkill.findMany({
          where: { organisationId },
          include: { skill: true, person: { select: { id: true, displayName: true } } },
          take: 400,
        }),
  ]);
  const graph = buildReportingGraph(graphInput);
  const groupName = new Map(groups.map((group) => [group.id, group.name]));
  const skillsByPerson = new Map<string, string[]>();
  for (const row of skills) {
    const list = skillsByPerson.get(row.personId) ?? [];
    list.push(row.skill.name);
    skillsByPerson.set(row.personId, list);
  }

  const lines: string[] = [];
  for (const node of graph.nodes.values()) {
    const occupant = node.occupants[0];
    if (!occupant) {
      lines.push(`Vacant seat: ${node.position.title}.`);
      continue;
    }
    const manager = node.primaryManagerId ? graph.nodes.get(node.primaryManagerId) : null;
    const groupNames = (occupant.person.groupIds ?? [])
      .map((id) => groupName.get(id))
      .filter((name): name is string => Boolean(name));
    const skillNames = skillsByPerson.get(occupant.person.id) ?? [];
    lines.push(
      [
        `${occupant.person.displayName} holds ${node.position.title}.`,
        manager
          ? `Reports to ${manager.occupants[0]?.person.displayName ?? 'a vacant seat'} (${manager.position.title}).`
          : 'Root seat.',
        groupNames.length ? `Groups: ${groupNames.join(', ')}.` : null,
        skillNames.length ? `Skills: ${skillNames.join(', ')}.` : null,
      ]
        .filter(Boolean)
        .join(' '),
    );
    if (lines.length >= limit) break;
  }
  return lines.join('\n');
}

export async function lookupEmployeeBrief(organisationId: string, query: string) {
  const [graphInput, groups, organisation] = await Promise.all([
    loadOrganisationGraph(organisationId),
    loadOrgGroups(organisationId),
    isDemoMode() ? Promise.resolve(demoOrganisation()) : prisma.organisation.findFirst({ where: { id: organisationId } }),
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
      const haystack = [occupant.person.displayName, occupant.person.email, node.position.title]
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
    modelConnected: settings.modelConnected,
    message: settings.privacyReviewComplete
      ? settings.modelConnected
        ? 'Privacy review is complete and DeepSeek is connected.'
        : 'Privacy review is marked complete, but no DeepSeek key is configured. Showing stored organisation facts only.'
      : 'Assistant answers stay disabled until privacy policies are cross-checked. You can still look people up from the live org chart.',
    matches: matches.slice(0, 20),
  };
}

export async function askOrganisation(organisationId: string, question: string) {
  const organisation = isDemoMode()
    ? demoOrganisation()
    : await prisma.organisation.findFirst({ where: { id: organisationId } });
  const settings = readAssistantSettings(organisation?.settings);
  if (!settings.privacyReviewComplete) {
    throw new ForbiddenError('Mark the assistant privacy review complete before sending org facts to a model.');
  }
  if (!settings.modelConnected) {
    throw new ValidationAppError('Add DEEPSEEK_API_KEY to the environment to enable Ask.');
  }
  const trimmed = question.trim();
  if (trimmed.length < 3) {
    throw new ValidationAppError('Ask a question about the organisation.');
  }
  const facts = await organisationFacts(organisationId);
  return completeOrgChat({ question: trimmed, facts });
}

export async function setPrivacyReview(organisationId: string, complete: boolean) {
  if (isDemoMode()) {
    throw new ValidationAppError('This hosted demo is read-only until a database is connected.');
  }
  const organisation = await prisma.organisation.findFirst({ where: { id: organisationId } });
  const current =
    organisation?.settings && typeof organisation.settings === 'object'
      ? (organisation.settings as Record<string, unknown>)
      : {};
  const next = {
    ...current,
    assistant: {
      privacyReviewComplete: complete,
      modelConnected: isDeepSeekConfigured(),
    },
  };
  await prisma.organisation.update({
    where: { id: organisationId },
    data: { settings: next },
  });
  return readAssistantSettings(next);
}
