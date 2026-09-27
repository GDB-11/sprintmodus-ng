import { Component, computed, input } from '@angular/core';

/** A toggle button styled as a chip, for client-side filters (priority, assignee...). Wraps a native `<button>`. */
@Component({
  selector: 'button[appFilterChip]',
  templateUrl: './filter-chip.html',
  host: {
    '[attr.aria-pressed]': 'pressed()',
    '[class]': 'classes()',
  },
})
export class FilterChip {
  readonly pressed = input(false);

  protected readonly classes = computed(
    () =>
      `inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150 ` +
      `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:focus-visible:outline-secondary-400 ` +
      (this.pressed()
        ? 'border-secondary-900 bg-secondary-900 text-white dark:border-secondary-400 dark:bg-secondary-400 dark:text-neutral-900'
        : 'border-control-border bg-control-track text-text hover:bg-neutral-200 dark:hover:bg-neutral-800'),
  );
}
