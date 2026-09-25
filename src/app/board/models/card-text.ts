import { ASSIGNMENT_ROLE_LABELS, Assignee } from '../../work-items/models/work-item.models';

/** `Ana Diaz (Desarrollo), Luis Lopez (Calidad (QA))`, or that nobody is assigned. */
export function assigneesText(assignees: readonly Assignee[]): string {
  return assignees.length === 0
    ? 'Sin asignar'
    : assignees.map((assignee) => `${assignee.fullName} (${ASSIGNMENT_ROLE_LABELS[assignee.role]})`).join(', ');
}

/** `1 elemento secundario`, `3 elementos secundarios`. */
export function childrenText(count: number): string {
  return count === 1 ? '1 elemento secundario' : `${count} elementos secundarios`;
}
