import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { Burndown, SPRINT_STATUS_LABELS, Sprint } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { valueOf } from '../../../shared/resource-value';
import { Chip } from '../../../shared/ui/chip/chip';
import { LineSparkline } from '../../../shared/ui/line-sparkline/line-sparkline';
import { Panel } from '../../../shared/ui/panel/panel';
import { lastActualPoint } from '../../../sprints/models/burndown-projection';

/**
 * The sprint the board shows, in one line: its name and state, the days left, the burndown as a sparkline and whether the
 * pace is behind the ideal line. Only a running sprint has a burndown; for any other selection the summary says what it is.
 */
@Component({
  selector: 'app-sprint-summary',
  imports: [DatePipe, Panel, Chip, LineSparkline],
  templateUrl: './sprint-summary.html',
})
export class SprintSummary {
  readonly sprint = input.required<Sprint>();

  private readonly projects = inject(ProjectService);
  protected readonly statusLabels = SPRINT_STATUS_LABELS;

  private readonly burndownResource = rxResource({
    params: () => (this.sprint().status === 'ACTIVE' ? this.sprint().sprintCode : undefined),
    stream: ({ params }) => (params ? this.projects.burndown(params) : of(null)),
  });
  protected readonly burndown = computed<Burndown | null>(() => valueOf(this.burndownResource) ?? null);

  protected readonly series = computed(() => {
    const burndown = this.burndown();
    if (!burndown || burndown.points.length < 2) {
      return null;
    }
    return {
      ideal: burndown.points.map((point) => point.idealRemainingHours),
      actual: burndown.points.map((point) => point.remainingHours),
    };
  });

  /** Whole days left, from the last recorded day; absent when nothing is recorded yet. */
  protected readonly daysLeft = computed(() => {
    const burndown = this.burndown();
    const last = burndown && lastActualPoint(burndown);
    return burndown && last ? Math.max(0, burndown.days - last.day) : null;
  });

  /** Behind when the hours left on the last recorded day are above the ideal line for that day. */
  protected readonly pace = computed<'behind' | 'on-track' | null>(() => {
    const burndown = this.burndown();
    const last = burndown && lastActualPoint(burndown);
    if (!last) {
      return null;
    }
    return (last.remainingHours ?? 0) > last.idealRemainingHours ? 'behind' : 'on-track';
  });

  protected readonly sparklineLabel = computed(
    () => `Burndown de ${this.sprint().name}: horas restantes reales frente a la línea ideal.`,
  );
}
