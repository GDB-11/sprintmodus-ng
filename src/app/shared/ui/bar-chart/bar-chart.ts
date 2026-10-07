import { Component, computed, input } from '@angular/core';

export interface BarChartGroup {
  label: string;
  /** One value per series, in the same order as `seriesLabels`. */
  values: readonly number[];
}

/**
 * Grouped vertical bars with a label under each group. Purely decorative (`aria-hidden`): whoever uses it repeats the
 * same numbers in a table or a sentence. The series differ by fill and by position, never by colour alone being the
 * only cue, since the legend sentence names them.
 */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
})
export class BarChart {
  readonly groups = input.required<readonly BarChartGroup[]>();

  /** The tallest bar is the largest value shown. */
  private readonly scale = computed(() => Math.max(1, ...this.groups().flatMap((group) => group.values)));

  protected percent(value: number): number {
    return Math.round((value / this.scale()) * 100);
  }

  protected seriesClass(index: number): string {
    return index === 0 ? 'bg-neutral-400 dark:bg-neutral-600' : 'bg-primary-600';
  }
}
