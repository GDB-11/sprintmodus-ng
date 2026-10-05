import { Component, computed, input } from '@angular/core';
import { Icon, IconName } from '../../../shared/ui/icon/icon';
import { ITEM_TYPE_LABELS, ITEM_TYPE_SHAPES, ItemType, ItemTypeShape } from '../../models/work-item.models';

const SHAPE_ICONS: Record<ItemTypeShape, IconName> = {
  diamond: 'marker-diamond',
  hexagon: 'marker-hexagon',
  circle: 'marker-circle',
  triangle: 'marker-triangle',
  square: 'marker-square',
};

/**
 * An item type as a shape, never colour alone (CLAUDE.md, "colour-only type markers"): a distinct outline per type,
 * plus the type name for screen readers. The icon has no colour of its own — it inherits whatever ink colour
 * surrounds it, so it never needs a token of its own to stay in contrast.
 */
@Component({
  selector: 'app-work-item-type-icon',
  imports: [Icon],
  host: { class: 'inline-flex items-center gap-1.5' },
  templateUrl: './work-item-type-icon.html',
})
export class WorkItemTypeIcon {
  readonly type = input.required<ItemType>();

  protected readonly icon = computed(() => SHAPE_ICONS[ITEM_TYPE_SHAPES[this.type()]]);
  protected readonly label = computed(() => ITEM_TYPE_LABELS[this.type()]);
}
