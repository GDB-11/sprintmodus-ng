import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarGroup } from '../../../shared/ui/avatar-group/avatar-group';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { SelectMenu, SelectMenuOption } from '../../../shared/ui/select-menu/select-menu';
import { Icon } from '../../../shared/ui/icon/icon';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { PriorityChip } from '../../../work-items/components/priority-chip/priority-chip';
import {
  ASSIGNMENT_ROLE_LABELS,
  AssignmentRole,
  WorkItemStatus,
  WorkItemSummary,
} from '../../../work-items/models/work-item.models';
import { WorkItemTreeNode } from '../../../work-items/components/work-item-tree-node/work-item-tree-node';
import { assigneesText, childrenText } from '../../models/card-text';

/** A status the card can go to. `allowed` is false when the workflow asks for a role this user does not have. */
export interface MoveOption {
  status: WorkItemStatus;
  allowed: boolean;
  requiredRole?: AssignmentRole;
}

/**
 * One card of the Kanban board: key, title, priority, effort, assignees, sprint, a collapsible tree of its children, and the
 * controls that change it. What the user may not do is shown but disabled, with the reason: a move that needs a role they
 * do not hold, and the order of the cards (owners and admins only). Dragging is one way to move a card and never the only one.
 */
@Component({
  selector: 'app-kanban-card',
  imports: [RouterLink, CdkDragHandle, WorkItemTreeNode, Card, PriorityChip, AvatarGroup, Button, SelectMenu, Icon, TextLink],
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

  protected readonly reorderHint = 'Solo los propietarios y administradores cambian el orden de las tarjetas.';
  protected readonly assigneesText = assigneesText;
  protected readonly childrenText = childrenText;
  protected readonly expanded = signal(false);

  protected readonly assigneeNames = computed(() => this.card().assignees.map((assignee) => assignee.fullName));
  protected readonly hasAllowedMove = computed(() => this.moves().some((move) => move.allowed));
  /** The role that would let this user move the card, when none of the moves is theirs. */
  protected readonly missingRole = computed(() => {
    const role = this.moves().find((move) => move.requiredRole)?.requiredRole;
    return role ? ASSIGNMENT_ROLE_LABELS[role] : null;
  });

  protected roleLabel(role: AssignmentRole | undefined): string {
    return role ? ASSIGNMENT_ROLE_LABELS[role] : '';
  }

  protected readonly moveOptions = computed<SelectMenuOption[]>(() =>
    this.moves().map((move) => ({
      value: move.status.code,
      label: move.status.displayName,
      disabled: !move.allowed,
      hint: move.allowed ? undefined : `requiere rol: ${this.roleLabel(move.requiredRole)}`,
    })),
  );

  protected onMoveSelected(status: string): void {
    if (status) {
      this.moveTo.emit(status);
    }
  }
}
