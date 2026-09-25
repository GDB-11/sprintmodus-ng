import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { SPRINT_STATUS_LABELS } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { BurndownChart } from '../burndown-chart/burndown-chart';

/** The burndown of one sprint: its facts and the chart. Anyone in the organization may read it. */
@Component({
  selector: 'app-burndown-page',
  imports: [Page, BurndownChart, DatePipe, DecimalPipe],
  templateUrl: './burndown-page.html',
})
export class BurndownPage {
  private readonly route = inject(ActivatedRoute);
  private readonly projects = inject(ProjectService);

  protected readonly statusLabels = SPRINT_STATUS_LABELS;

  private readonly code = toSignal(this.route.paramMap.pipe(map((params) => params.get('code'))), { requireSync: true });

  protected readonly burndown = rxResource({
    params: () => this.code() ?? undefined,
    stream: ({ params }) => this.projects.burndown(params),
  });

  protected readonly loaded = computed(() => valueOf(this.burndown));
  protected readonly heading = computed(() => {
    const loaded = this.loaded();
    return loaded ? `Burndown de ${loaded.sprintName}` : 'Burndown';
  });
  protected readonly latest = computed(() =>
    [...(this.loaded()?.points ?? [])].reverse().find((point) => point.day >= 1 && point.remainingHours != null),
  );
  protected readonly errorMessage = computed(() =>
    this.burndown.error() ? apiErrorMessage(this.burndown.error(), 'No se pudo cargar el burndown.') : null,
  );
}
