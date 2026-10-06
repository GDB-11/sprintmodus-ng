import { Component, input, model } from '@angular/core';
import { FilterChip } from '../../../shared/ui/filter-chip/filter-chip';

export interface ColumnTab {
  code: string;
  label: string;
  count: number;
}

/**
 * Below the `lg` breakpoint the board shows one column at a time: these chips (`Por hacer · 3`) pick which. A scrolling row of
 * pressed-state buttons, so no column is reachable only by swiping.
 */
@Component({
  selector: 'app-column-tabs',
  imports: [FilterChip],
  templateUrl: './column-tabs.html',
  host: { class: 'lg:hidden' },
})
export class ColumnTabs {
  readonly tabs = input.required<readonly ColumnTab[]>();
  readonly selected = model.required<string>();
}
