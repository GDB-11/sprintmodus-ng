import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';

/** Acceptance criteria as a checked list: free text, one line per non-empty line. */
@Component({
  selector: 'app-criteria-list',
  imports: [Icon],
  templateUrl: './criteria-list.html',
})
export class CriteriaList {
  readonly text = input.required<string>();

  protected readonly lines = computed(() =>
    this.text()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}
