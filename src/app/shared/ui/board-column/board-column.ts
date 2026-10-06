import { Component, booleanAttribute, computed, input } from '@angular/core';

/**
 * One column of a board. Quiet by default (the mock's columns are just a header over their cards); `dropTarget` outlines it
 * while a card that may be dropped here is being dragged. Wraps a native `<section>`.
 */
@Component({
  selector: 'section[appBoardColumn]',
  templateUrl: './board-column.html',
  host: {
    '[class]': 'classes()',
  },
})
export class BoardColumn {
  readonly dropTarget = input(false, { transform: booleanAttribute });
  /** False hides the column below `lg`, where a board shows one column at a time; from `lg` up every column shows. */
  readonly shown = input(true, { transform: booleanAttribute });

  protected readonly classes = computed(
    () =>
      (this.shown() ? 'flex ' : 'hidden lg:flex ') + 'min-w-0 flex-col gap-2 rounded-[10px] border p-2 ' +
      (this.dropTarget()
        ? 'border-secondary-900 outline-2 outline-secondary-900 dark:border-secondary-400 dark:outline-secondary-400'
        : 'border-transparent'),
  );
}
