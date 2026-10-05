import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chip } from '../../../shared/ui/chip/chip';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { ItemType, Priority, WorkItemRowItem, WorkItemStatus } from '../../models/work-item.models';
import { PriorityChip } from '../priority-chip/priority-chip';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemTypeIcon } from '../work-item-type-icon/work-item-type-icon';

export interface WorkItemHeaderData {
  type: ItemType;
  displayKey: string;
  status: WorkItemStatus;
  title: string;
  priority: Priority;
  sprintLabel: string;
  effortLabel: string;
}

/**
 * A work item's own page header: its ancestor trail (root first), type + key + status, the `<h1>` title, and its
 * priority/sprint/effort chips. This is `work-item-detail`'s single heading source (it replaces `app-page-header` on
 * that screen, since a plain heading can't carry the ancestor trail and chips a work item needs next to its title).
 */
@Component({
  selector: 'app-work-item-header',
  imports: [RouterLink, TextLink, Chip, WorkItemTypeIcon, StatusLabel, PriorityChip],
  templateUrl: './work-item-header.html',
})
export class WorkItemHeader {
  readonly item = input.required<WorkItemHeaderData>();
  /** Root first, immediate parent last. Empty for a root item (an Epic, or a "Sin épica" item). */
  readonly ancestors = input<readonly WorkItemRowItem[]>([]);
}
