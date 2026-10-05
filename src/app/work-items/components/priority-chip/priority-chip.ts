import { Component, computed, input } from '@angular/core';
import { Chip, ChipTone } from '../../../shared/ui/chip/chip';
import { PRIORITY_LABELS, PRIORITY_TONES, Priority } from '../../models/work-item.models';

/** A priority as a toned `app-chip`: the word always says the priority, the tone only backs it up. */
@Component({
  selector: 'app-priority-chip',
  imports: [Chip],
  templateUrl: './priority-chip.html',
})
export class PriorityChip {
  readonly priority = input.required<Priority>();

  protected readonly tone = computed<ChipTone>(() => PRIORITY_TONES[this.priority()]);
  protected readonly label = computed(() => PRIORITY_LABELS[this.priority()]);
}
