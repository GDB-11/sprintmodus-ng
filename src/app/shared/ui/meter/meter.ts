import { Component, computed, input } from '@angular/core';

/** A labelled usage meter (e.g. "4 / 10 proyectos"). The numbers are always visible text, never colour alone. */
@Component({
  selector: 'app-meter',
  templateUrl: './meter.html',
})
export class Meter {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly max = input.required<number>();

  protected readonly percent = computed(() => Math.min(100, Math.max(0, (this.value() / Math.max(this.max(), 1)) * 100)));
}
