import type { ChatTool } from '@/server/llm/client';
import { can, type Actor } from '@/domain/permissions/policy';
import { listObjectives } from '@/server/services/okr-service';
import { addSeat, removeSeat, updateSeat } from '@/server/services/chart-edit-service';
import { reparentPosition } from '@/server/services/reparent-service';
import {
  compactRoster,
  loadAssistantIndex,
  matchSeats,
  requireOneSeat,
  seatLabel,
  type AssistantIndex,
  type AssistantSeat,
} from '@/server/services/assistant-index';

export interface AssistantAction {
  name: string;
  ok: boolean;
  mutating: boolean;
  summary: string;
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function publicSeat(seat: AssistantSeat) {
  return {
    name: seat.displayName,
    title: seat.title,
    department: seat.department,
    manager: seat.managerName,
    reports: seat.reportCount,
    vacant: seat.vacant,
    positionId: seat.positionId,
    personId: seat.personId,
  };
}

export const ASSISTANT_TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'org_overview',
      description: 'Scan live organisation counts, departments, vacant seats, and OKRs.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_people',
      description: 'Search people and vacant seats by name, title, or department.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Name, title, or department fragment' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'person_details',
      description: 'Get one person or vacant seat, including manager and direct reports.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Person name or job title' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_reports',
      description: 'List direct reports of a manager.',
      parameters: {
        type: 'object',
        properties: { manager: { type: 'string', description: 'Manager name or title' } },
        required: ['manager'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_person',
      description: 'Rename a person or change their job title on the live chart.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Current name or title' },
          displayName: { type: 'string', description: 'New display name' },
          title: { type: 'string', description: 'New job title' },
        },
        required: ['person'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_person',
      description: 'Change who someone reports to on the live org chart.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Person to move' },
          newManager: { type: 'string', description: 'New manager name or title' },
        },
        required: ['person', 'newManager'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_person',
      description: 'Add a person and seat to the live organisation.',
      parameters: {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          title: { type: 'string' },
          manager: { type: 'string', description: 'Optional manager name or title' },
        },
        required: ['displayName', 'title'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_person',
      description: 'Remove a seat from the live chart. Direct reports move up to the current manager.',
      parameters: {
        type: 'object',
        properties: { person: { type: 'string' } },
        required: ['person'],
        additionalProperties: false,
      },
    },
  },
];

const READ_TOOLS = new Set(['org_overview', 'find_people', 'person_details', 'list_reports']);

export function toolsForActor(actor: Actor): ChatTool[] {
  const canWrite =
    can(actor, 'people:write') && can(actor, 'positions:write') && can(actor, 'relationships:write');
  if (canWrite) return ASSISTANT_TOOLS;
  return ASSISTANT_TOOLS.filter((tool) => READ_TOOLS.has(tool.function.name));
}

export async function executeAssistantTool(input: {
  organisationId: string;
  actor: Actor;
  name: string;
  arguments: string;
  index: AssistantIndex;
}): Promise<{ action: AssistantAction; payload: unknown; index: AssistantIndex }> {
  const args = parseArgs(input.arguments);
  let index = input.index;
  const refresh = async () => {
    index = await loadAssistantIndex(input.organisationId);
    return index;
  };

  const fail = (summary: string, extra?: unknown) => ({
    action: { name: input.name, ok: false, mutating: false, summary },
    payload: { error: summary, ...(extra && typeof extra === 'object' ? extra : {}) },
    index,
  });

  try {
    switch (input.name) {
      case 'org_overview': {
        const occupied = index.seats.filter((seat) => !seat.vacant).length;
        const vacant = index.seats.filter((seat) => seat.vacant);
        const objectives = await listObjectives(input.organisationId);
        return {
          action: {
            name: input.name,
            ok: true,
            mutating: false,
            summary: `Scanned ${occupied} people and ${vacant.length} vacant seats.`,
          },
          payload: {
            people: occupied,
            seats: index.seats.length,
            vacantSeats: vacant.map((seat) => seat.title).slice(0, 20),
            departments: index.departments.map((department) => department.name),
            roots: index.seats.filter((seat) => !seat.managerPositionId).map(seatLabel),
            okrs: objectives.slice(0, 12).map((objective) => ({
              title: objective.title,
              owner: objective.ownerPerson?.displayName ?? null,
              keyResults: objective.keyResults?.length ?? 0,
            })),
            rosterPreview: compactRoster(index.seats, 40),
          },
          index,
        };
      }
      case 'find_people': {
        const query = asString(args.query);
        const matches = matchSeats(index.seats, query).map(publicSeat);
        return {
          action: {
            name: input.name,
            ok: true,
            mutating: false,
            summary: matches.length
              ? `Found ${matches.length} match${matches.length === 1 ? '' : 'es'} for "${query}".`
              : `No matches for "${query}".`,
          },
          payload: { query, matches },
          index,
        };
      }
      case 'person_details': {
        const resolved = requireOneSeat(index.seats, asString(args.query), 'person');
        if (!resolved.ok) return fail(resolved.error, { matches: resolved.matches?.map(publicSeat) });
        const reports = index.seats
          .filter((seat) => seat.managerPositionId === resolved.seat.positionId)
          .map(publicSeat);
        return {
          action: { name: input.name, ok: true, mutating: false, summary: `Loaded ${seatLabel(resolved.seat)}.` },
          payload: { person: publicSeat(resolved.seat), reports },
          index,
        };
      }
      case 'list_reports': {
        const resolved = requireOneSeat(index.seats, asString(args.manager), 'manager');
        if (!resolved.ok) return fail(resolved.error);
        const reports = index.seats
          .filter((seat) => seat.managerPositionId === resolved.seat.positionId)
          .map(publicSeat);
        return {
          action: {
            name: input.name,
            ok: true,
            mutating: false,
            summary: `${seatLabel(resolved.seat)} has ${reports.length} direct report${reports.length === 1 ? '' : 's'}.`,
          },
          payload: { manager: publicSeat(resolved.seat), reports },
          index,
        };
      }
      case 'update_person': {
        if (!can(input.actor, 'positions:write')) return fail('You need editor access to change people.');
        const resolved = requireOneSeat(index.seats, asString(args.person), 'person');
        if (!resolved.ok) return fail(resolved.error);
        const displayName = asString(args.displayName) || undefined;
        const title = asString(args.title) || undefined;
        if (!displayName && !title) return fail('Provide a new name and/or title.');
        await updateSeat({
          organisationId: input.organisationId,
          actor: input.actor,
          positionId: resolved.seat.positionId,
          displayName,
          title,
        });
        await refresh();
        const summary = `Updated ${resolved.seat.displayName}${title ? ` · title ${title}` : ''}${displayName ? ` · name ${displayName}` : ''}.`;
        return { action: { name: input.name, ok: true, mutating: true, summary }, payload: { ok: true, summary }, index };
      }
      case 'move_person': {
        if (!can(input.actor, 'relationships:write')) return fail('You need editor access to change reporting lines.');
        const person = requireOneSeat(index.seats, asString(args.person), 'person');
        const manager = requireOneSeat(index.seats, asString(args.newManager), 'manager');
        if (!person.ok) return fail(person.error);
        if (!manager.ok) return fail(manager.error);
        const result = await reparentPosition({
          organisationId: input.organisationId,
          actor: input.actor,
          subordinatePositionId: person.seat.positionId,
          managerPositionId: manager.seat.positionId,
          mode: 'LIVE',
        });
        await refresh();
        const summary = result.unchanged
          ? `${person.seat.displayName} already reports to ${manager.seat.displayName}.`
          : `Moved ${person.seat.displayName} to report to ${manager.seat.displayName}.`;
        return {
          action: { name: input.name, ok: true, mutating: !result.unchanged, summary },
          payload: { ok: true, summary },
          index,
        };
      }
      case 'add_person': {
        if (!can(input.actor, 'people:write')) return fail('You need editor access to add people.');
        const displayName = asString(args.displayName);
        const title = asString(args.title);
        if (!displayName || !title) return fail('Need a name and title to add someone.');
        let managerPositionId: string | null = null;
        const managerQuery = asString(args.manager);
        if (managerQuery) {
          const manager = requireOneSeat(index.seats, managerQuery, 'manager');
          if (!manager.ok) return fail(manager.error);
          managerPositionId = manager.seat.positionId;
        }
        await addSeat({
          organisationId: input.organisationId,
          actor: input.actor,
          displayName,
          title,
          managerPositionId,
        });
        await refresh();
        const summary = `Added ${displayName} as ${title}${managerQuery ? ` reporting to ${managerQuery}` : ''}.`;
        return { action: { name: input.name, ok: true, mutating: true, summary }, payload: { ok: true, summary }, index };
      }
      case 'remove_person': {
        if (!can(input.actor, 'positions:write')) return fail('You need editor access to remove seats.');
        const resolved = requireOneSeat(index.seats, asString(args.person), 'person');
        if (!resolved.ok) return fail(resolved.error);
        await removeSeat({
          organisationId: input.organisationId,
          actor: input.actor,
          positionId: resolved.seat.positionId,
        });
        await refresh();
        const summary = `Removed ${seatLabel(resolved.seat)} from the live chart.`;
        return { action: { name: input.name, ok: true, mutating: true, summary }, payload: { ok: true, summary }, index };
      }
      default:
        return fail(`Unknown tool ${input.name}.`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Tool failed.');
  }
}
