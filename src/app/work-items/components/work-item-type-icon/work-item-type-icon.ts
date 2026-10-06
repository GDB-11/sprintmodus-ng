import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';
import { ITEM_TYPE_LABELS, ITEM_TYPE_LOOKS, ItemType } from '../../models/work-item.models';

/** An item type as an Azure DevOps-style glyph in a coloured badge, plus the type name for screen readers. */
@Component({
  selector: 'app-work-item-type-icon',
  imports: [Icon],
  host: { class: 'inline-flex shrink-0 items-center' },
  templateUrl: './work-item-type-icon.html',
})
export class WorkItemTypeIcon {
  readonly type = input.required<ItemType>();

  protected readonly look = computed(() => ITEM_TYPE_LOOKS[this.type()]);
  protected readonly label = computed(() => ITEM_TYPE_LABELS[this.type()]);
}
