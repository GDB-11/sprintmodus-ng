import { Component, computed, input } from '@angular/core';

export type ChartKeyKind = 'ideal' | 'actual' | 'projection';

/** The line sample in a chart legend. Colour (theme classes on the host) and dash pattern differ per kind, never colour alone. */
const KEY_CLASSES: Record<ChartKeyKind, string> = {
  ideal: 'text-info-700 dark:text-info-600',
  actual: 'text-error-700 dark:text-error-500',
  projection: 'text-neutral-800 dark:text-neutral-300',
};

/**
 * A legend key for a chart line: ideal dashed, actual solid with a marker, projection dotted. The host carries the theme
 * colour, so a canvas chart can read what it computes to (`getComputedStyle(host).color`) instead of holding colours itself.
 */
@Component({
  selector: 'app-chart-key',
  templateUrl: './chart-key.html',
  host: {
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class ChartKey {
  readonly kind = input.required<ChartKeyKind>();

  protected readonly classes = computed(() => `inline-flex shrink-0 ${KEY_CLASSES[this.kind()]}`);
}
