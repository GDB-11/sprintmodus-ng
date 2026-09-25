import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { VelocityHistory as History } from '../../../projects/models/project.models';

/**
 * What the last closed sprints completed, oldest first, and their average: what a team can plan the next sprint with. The
 * bars only repeat the numbers beside them, so they are hidden from assistive technology and the table carries everything.
 */
@Component({
  selector: 'app-velocity-history',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './velocity-history.html',
})
export class VelocityHistory {
  readonly history = input.required<History>();

  /** The longest bar is the largest number shown, planned or completed. */
  private readonly scale = computed(() => Math.max(1, ...this.history().sprints.flatMap((sprint) => [sprint.plannedVelocity, sprint.velocity])));

  protected percent(points: number): number {
    return Math.round((points / this.scale()) * 100);
  }
}
