import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { VelocityHistory as History, Sprint } from '../../../projects/models/project.models';
import { BarChart, BarChartGroup } from '../../../shared/ui/bar-chart/bar-chart';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';

/**
 * What the last closed sprints completed, oldest first, and their average: what a team can plan the next sprint with. The
 * bars only repeat the numbers beside them, so they are hidden from assistive technology and the table carries everything.
 */
@Component({
  selector: 'app-velocity-history',
  imports: [DatePipe, DecimalPipe, BarChart, DataTable, DataTableCell, Disclosure, EmptyState],
  templateUrl: './velocity-history.html',
})
export class VelocityHistory {
  readonly history = input.required<History>();

  protected readonly columns: readonly DataTableColumn<Sprint>[] = [
    { header: 'Sprint' },
    { header: 'Cerró el' },
    { header: 'Planificados', numeric: true },
    { header: 'Completados', numeric: true },
  ];

  /** Planned first, completed second, labelled by the number in the sprint's name ("Sprint 14" → "S14"). */
  protected readonly groups = computed<BarChartGroup[]>(() =>
    this.history().sprints.map((sprint) => ({
      label: sprint.name.replace(/^Sprint\s+/i, 'S'),
      values: [sprint.plannedVelocity, sprint.velocity],
    })),
  );

  protected readonly trackBySprint = (sprint: Sprint) => sprint.sprintCode;
}
