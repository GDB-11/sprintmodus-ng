import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ASSIGNMENT_ROLE_LABELS,
  AssignmentRole,
  PRIORITY_LABELS,
  Priority,
  WorkItemStatus,
  WorkItemSummary,
} from '../../../work-items/models/work-item.models';
import { assigneesText, childrenText } from '../../models/card-text';
import { CardChildren } from '../card-children/card-children';

/** A status the card can go to. `allowed` is false when the workflow asks for a role this user does not have. */
export interface MoveOption {
  status: WorkItemStatus;
  allowed: boolean;
  requiredRole?: AssignmentRole;
}

/** Text and background pairs checked in `theme-contrast.spec.ts`; the word says the priority, colour only backs it up. */
const PRIORITY_CLASSES: Record<Priority, string> = {
  CRITICAL: 'bg-error-100 text-error-900',
  HIGH: 'bg-warning-100 text-warning-900',
  MEDIUM: 'bg-info-100 text-info-900',
  LOW: 'bg-neutral-200 text-neutral-900',
};

const COMPACT_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';

/**
 * One card of the Kanban board: key, title, priority, effort, assignees, sprint, a collapsible tree of its children, and the
 * controls that change it. What the user may not do is shown but disabled, with the reason: a move that needs a role they
 * do not hold, and the order of the cards (owners and admins only). Dragging is one way to move a card and never the only one.
 */
@Component({
  selector: 'app-kanban-card',
  imports: [RouterLink, CdkDragHandle, CardChildren],
  templateUrl: './kanban-card.html',
})
export class KanbanCard {
  readonly card = input.required<WorkItemSummary>();
  /** Where the workflow lets the card go, and which of those this user may choose. */
  readonly moves = input<readonly MoveOption[]>([]);
  /** A move of this card that the server has not answered yet. */
  readonly pending = input(false);
  /** The sprint's name (or "Backlog") when the board shows more than one sprint. */
  readonly sprintLabel = input<string | null>(null);
  readonly canReorder = input(false);
  readonly canMoveUp = input(false);
  readonly canMoveDown = input(false);

  readonly moveTo = output<string>();
  readonly reorder = output<'up' | 'down'>();

  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly compactButtonClasses = COMPACT_BUTTON_CLASSES;
  protected readonly reorderHint = 'Solo los propietarios y administradores cambian el orden de las tarjetas.';
  protected readonly assigneesText = assigneesText;
  protected readonly childrenText = childrenText;
  protected readonly expanded = signal(false);

  protected readonly priorityClasses = computed(() => PRIORITY_CLASSES[this.card().priority]);
  protected readonly hasAllowedMove = computed(() => this.moves().some((move) => move.allowed));
  /** The role that would let this user move the card, when none of the moves is theirs. */
  protected readonly missingRole = computed(() => {
    const role = this.moves().find((move) => move.requiredRole)?.requiredRole;
    return role ? ASSIGNMENT_ROLE_LABELS[role] : null;
  });

  protected roleLabel(role: AssignmentRole | undefined): string {
    return role ? ASSIGNMENT_ROLE_LABELS[role] : '';
  }

  protected onMoveSelected(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value;
    select.value = '';
    if (status) {
      this.moveTo.emit(status);
    }
  }
}
