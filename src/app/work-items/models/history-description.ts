import { ASSIGNMENT_ROLE_LABELS, HistoryEntry, ITEM_TYPE_LABELS, LINK_TYPE_LABELS, PRIORITY_LABELS } from './work-item.models';

/** What a history entry says, ready to show: a sentence that continues "<who> …", plus what it is about. */
export interface ChangeDescription {
  text: string;
  /** A work item the sentence ends on, shown as a link. */
  item?: { code: string; key: string };
  /** For a change to a long text: what it said before and after (`null` = it was empty). */
  before?: string | null;
  after?: string | null;
  /** The words of a comment. */
  quote?: string;
}

/** The names of the item's sprints by code, to say where an item came from: the backend only records the target's name. */
export type SprintNames = Readonly<Record<string, string>>;

const FIELD_LABELS: Record<string, string> = {
  Title: 'el título',
  Description: 'la descripción',
  AcceptanceCriteria: 'los criterios de aceptación',
  Priority: 'la prioridad',
  EffortPoints: 'los puntos de esfuerzo',
  EstimatedHours: 'las horas estimadas',
  RemainingHours: 'las horas restantes',
  BoardRank: 'su posición en el tablero',
  Status: 'el estado',
};

/** Long texts are not put in a sentence: their change is shown apart, before and after. */
const LONG_TEXT_FIELDS = new Set(['Description', 'AcceptanceCriteria']);

/** One template per kind of change. Values the backend stores as English codes are shown in Spanish; an unknown one is shown as it is. */
export function describeChange(entry: HistoryEntry, sprintNames: SprintNames = {}): ChangeDescription {
  const data = entry.additionalData;
  const old = entry.oldValue || null;
  const now = entry.newValue || null;

  switch (entry.changeType) {
    case 'CREATED': {
      const type = data['type'] as keyof typeof ITEM_TYPE_LABELS | undefined;
      return { text: type && ITEM_TYPE_LABELS[type] ? `creó este elemento (${ITEM_TYPE_LABELS[type].toLowerCase()})` : 'creó este elemento' };
    }
    case 'STATE_CHANGED':
      return { text: `cambió el estado de ${quote(data['from'] ?? old)} a ${quote(data['to'] ?? now)}` };
    case 'ASSIGNED':
      return { text: `asignó a ${person(entry, now)}` };
    case 'UNASSIGNED':
      return { text: `quitó a ${person(entry, old)} de la asignación` };
    case 'EFFORT_CHANGED':
    case 'FIELD_CHANGED':
    case 'DESCRIPTION_EDITED':
      return fieldChange(entry, old, now);
    case 'PARENT_CHANGED':
      return { text: parentChange(data['from'], data['to']) };
    case 'SPRINT_CHANGED':
      return { text: sprintChange(entry, sprintNames) };
    case 'COMMENTED':
      return { text: 'comentó', quote: now ?? undefined };
    case 'COMMENT_EDITED':
      return { text: 'editó un comentario', quote: now ?? undefined };
    case 'COMMENT_DELETED':
      return { text: 'eliminó un comentario', quote: old ?? undefined };
    case 'LINKED':
      return linkChange(entry, 'agregó la relación', now);
    case 'UNLINKED':
      return linkChange(entry, 'quitó la relación', old);
    case 'DELETED':
      return { text: 'eliminó este elemento' };
    case 'RESTORED':
      return { text: 'restauró este elemento' };
  }
}

function fieldChange(entry: HistoryEntry, old: string | null, now: string | null): ChangeDescription {
  const field = entry.field ?? '';
  const label = FIELD_LABELS[field] ?? (field ? `el campo ${field}` : 'un campo');
  if (LONG_TEXT_FIELDS.has(field) || entry.changeType === 'DESCRIPTION_EDITED') {
    return { text: `editó ${label}`, before: old, after: now };
  }
  return { text: `cambió ${label} de ${shown(field, old)} a ${shown(field, now)}` };
}

/** A value inside a sentence: priorities in words, text in quotes, numbers as they are, nothing as "sin valor". */
function shown(field: string, value: string | null): string {
  if (value === null) {
    return 'sin valor';
  }
  if (field === 'Priority') {
    return PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] ?? value;
  }
  return field === 'Title' || field === 'AcceptanceCriteria' ? quote(value) : value;
}

function person(entry: HistoryEntry, label: string | null): string {
  const name = entry.additionalData['fullName'];
  const role = entry.additionalData['role'] as keyof typeof ASSIGNMENT_ROLE_LABELS | undefined;
  if (!name) {
    return label ?? 'un usuario'; // written before names were kept: the stored label, as it is
  }
  return role && ASSIGNMENT_ROLE_LABELS[role] ? `${name} (${ASSIGNMENT_ROLE_LABELS[role]})` : name;
}

function parentChange(from: string | undefined, to: string | undefined): string {
  if (from && to) {
    return `cambió el elemento superior de ${from} a ${to}`;
  }
  if (to) {
    return `puso ${to} como elemento superior`;
  }
  if (from) {
    return `quitó su elemento superior (${from})`;
  }
  return 'cambió el elemento superior';
}

function sprintChange(entry: HistoryEntry, sprintNames: SprintNames): string {
  const before = entry.oldValue ? (sprintNames[entry.oldValue] ?? null) : null;
  const wasIn = entry.oldValue ? `antes en ${before ? quote(before) : 'otro sprint'}` : 'antes sin sprint';
  if (!entry.newValue) {
    return `devolvió el elemento al backlog (${wasIn})`;
  }
  const target = entry.additionalData['sprint'] ?? sprintNames[entry.newValue];
  return `movió el elemento al sprint ${target ? quote(target) : 'de otro proyecto'} (${wasIn})`;
}

function linkChange(entry: HistoryEntry, verb: string, label: string | null): ChangeDescription {
  const data = entry.additionalData;
  const type = data['type'] as keyof typeof LINK_TYPE_LABELS | undefined;
  const relation = type && LINK_TYPE_LABELS[type] ? ` ${quote(LINK_TYPE_LABELS[type])}` : '';
  const key = data['targetKey'];
  if (key && data['targetCode']) {
    return { text: `${verb}${relation} con`, item: { code: data['targetCode'], key } };
  }
  // written before the key was kept: the stored "KEY (TYPE)" label
  return { text: `${verb}${relation}${label ? ` con ${label}` : ''}` };
}

function quote(value: string | null | undefined): string {
  return value ? `«${value}»` : '«sin valor»';
}
