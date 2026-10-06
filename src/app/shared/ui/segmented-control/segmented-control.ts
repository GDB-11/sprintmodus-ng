import { Component, input, model } from '@angular/core';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** A single-choice toggle group (e.g. Árbol / Vista general / Lista), rendered as `role="group"` + `aria-pressed` buttons. */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.html',
})
export class SegmentedControl<T extends string> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = model.required<T>();
  readonly groupLabel = input.required<string>();

  protected optionClasses(option: SegmentedOption<T>): string {
    const base =
      'rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 ' +
      'focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:focus-visible:outline-secondary-400';
    return this.value() === option.value
      ? `${base} bg-light-bg text-text shadow-sm dark:bg-control-border`
      : `${base} text-text-muted hover:text-text`;
  }
}
