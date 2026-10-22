import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { Burndown, SPRINT_STATUS_LABELS, Sprint } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { valueOf } from '../../../shared/resource-value';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Chip } from '../../../shared/ui/chip/chip';
import { LineSparkline } from '../../../shared/ui/line-sparkline/line-sparkline';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { Panel } from '../../../shared/ui/panel/panel';
import { lastActualPoint } from '../../../sprints/models/burndown-projection';
import { sprintPace } from '../../../sprints/models/sprint-pace';

/**
 * The sprint the board shows, in one line: its name and state, the days left, the burndown as a sparkline and whether the
 * pace is behind the ideal line. A planned sprint has no burndown yet, so the summary says when it starts; a closed one shows its frozen numbers.
 */
@Component({
  selector: 'app-sprint-summary',
  imports: [DatePipe, RouterLink, Panel, Chip, LineSparkline, Skeleton, ErrorState, TextLink],
  templateUrl: './sprint-summary.html',
})
export class SprintSummary {
  readonly sprint = input.required<Sprint>();

  private readonly projects = inject(ProjectService);
  protected readonly statusLabels = SPRINT_STATUS_LABELS;

  private readonly burndownResource = rxResource({
    params: () => (this.sprint().status === 'PLANNED' ? undefined : this.sprint().sprintCode),
    stream: ({ params }) => (params ? this.projects.burndown(params) : of(null)),
  });
  protected readonly burndown = computed<Burndown | null>(() => valueOf(this.burndownResource) ?? null);

  protected readonly loading = computed(() => this.burndownResource.status() === 'loading');
  protected readonly failed = computed(() => !!this.burndownResource.error());

  protected reload(): void {
    this.burndownResource.reload();
  }

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
    return this.sprint().status === 'ACTIVE' && burndown && last ? Math.max(0, burndown.days - last.day) : null;
  });

  /** Behind when the hours left on the last recorded day are above the ideal line for that day. */
  protected readonly pace = computed<'behind' | 'on-track' | null>(() => {
    const burndown = this.burndown();
    const current = burndown && this.sprint().status === 'ACTIVE' ? sprintPace(burndown) : null;
    return current ? (current.behind ? 'behind' : 'on-track') : null;
  });

  /** Hours left against the hours the sprint began with; absent while no day is recorded. */
  protected readonly hours = computed(() => {
    const burndown = this.burndown();
    const current = burndown && sprintPace(burndown);
    return current && { remaining: current.remainingHours, planned: current.baselineHours };
  });

  /** An active sprint whose first day has not been recorded yet (day 0 only). */
  protected readonly noDaysYet = computed(
    () => this.sprint().status === 'ACTIVE' && !this.loading() && !this.failed() && this.burndown() !== null && this.hours() === null,
  );

  protected readonly sparklineLabel = computed(
    () => `Burndown de ${this.sprint().name}: horas restantes reales frente a la línea ideal.`,
  );
}
