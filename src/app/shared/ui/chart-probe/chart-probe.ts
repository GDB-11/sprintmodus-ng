import { Component, computed, input } from '@angular/core';

export type ChartProbeRole = 'ink' | 'grid' | 'surface';

const PROBE_CLASSES: Record<ChartProbeRole, string> = {
  ink: 'text-neutral-800 dark:text-neutral-300',
  grid: 'border-t border-neutral-300 dark:border-neutral-700',
  surface: 'bg-light-bg dark:bg-dark-bg',
};

/**
 * An invisible element that carries one of a canvas chart's theme colours (text ink, grid line, page surface) as theme
 * classes, so the chart reads what they compute to and light/dark follow the page. Not rendered, not announced.
 */
@Component({
  selector: 'app-chart-probe',
  templateUrl: './chart-probe.html',
  host: {
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class ChartProbe {
  readonly kind = input.required<ChartProbeRole>();

  protected readonly classes = computed(() => `hidden ${PROBE_CLASSES[this.kind()]}`);
}
