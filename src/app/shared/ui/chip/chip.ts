import { Component, computed, input } from '@angular/core';

export type ChipTone = 'neutral' | 'error' | 'warning' | 'info' | 'success';

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: 'bg-neutral-200 text-neutral-900',
  error: 'bg-error-100 text-error-900',
  warning: 'bg-warning-100 text-warning-900',
  info: 'bg-info-100 text-info-900',
  success: 'bg-success-100 text-success-900',
};

/** A small pill of text (priority, status stage, sprint state...), toned by one of the five semantic colours. */
@Component({
  selector: 'app-chip',
  templateUrl: './chip.html',
})
export class Chip {
  readonly tone = input<ChipTone>('neutral');

  protected readonly classes = computed(
    () => `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE_CLASSES[this.tone()]}`,
  );
}
