import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { assigneesText } from '../../../board/models/card-text';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { WorkItemRowItem } from '../../models/work-item.models';
import { PriorityChip } from '../priority-chip/priority-chip';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemTypeIcon } from '../work-item-type-icon/work-item-type-icon';

/**
 * One work item as a line: type, key (linked), title, status, priority and points. The single place for this recipe
 * (CLAUDE.md, Components rule 6) — a tree node's own row, an overview row, a "Secundarios"/relations list entry and a
 * search result are all this component, fed whatever fields they have (`WorkItemRowItem`).
 */
@Component({
  selector: 'app-work-item-row',
  imports: [RouterLink, TextLink, WorkItemTypeIcon, StatusLabel, PriorityChip],
  templateUrl: './work-item-row.html',
})
export class WorkItemRow {
  readonly item = input.required<WorkItemRowItem>();
  /** Hides the assignees line, for contexts where it would just repeat what the page already shows (e.g. inside a tree). */
  readonly showAssignees = input(false);

  protected readonly assigneesLabel = computed(() => assigneesText(this.item().assignees ?? []));
}
