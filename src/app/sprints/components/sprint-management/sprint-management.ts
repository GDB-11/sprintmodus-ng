import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Permissions } from '../../../auth/services/permissions.service';
import {
  Burndown,
  SPRINT_STATUS_LABELS,
  SPRINT_STATUS_TONES,
  Sprint,
} from '../../../projects/models/project.models';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Button } from '../../../shared/ui/button/button';
import { Chip, ChipTone } from '../../../shared/ui/chip/chip';
import { ConfirmInline } from '../../../shared/ui/confirm-inline/confirm-inline';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Icon } from '../../../shared/ui/icon/icon';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { BurndownChart } from '../burndown-chart/burndown-chart';
import { SprintCreate } from '../sprint-create/sprint-create';
import { SprintSettings } from '../sprint-settings/sprint-settings';
import { VelocityHistory } from '../velocity-history/velocity-history';

/** How many closed sprints the velocity history looks back over. */
export const HISTORY_SPRINTS = 6;

const MONTH_DAY = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('es', { month: 'short', timeZone: 'UTC' });

/** "7–20 oct", or "22 sep–6 oct" when the sprint crosses a month. */
function dateRange(start: string, end: string): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  return MONTH.format(from) === MONTH.format(to)
    ? `${DAY.format(from)}–${MONTH_DAY.format(to)}`
    : `${MONTH_DAY.format(from)}–${MONTH_DAY.format(to)}`;
}

/**
 * Sprints of one project (the one the shell has selected): see them, start and close them, how the one that runs is going
 * and, over the last ones, how much the team completes. Planning is for owners and admins; everyone else sees the same screen
 * with those controls disabled and the reason. Starting a sprint begins its burndown; closing one asks first, because it locks
 * the sprint's velocity and burndown.
 */
@Component({
  selector: 'app-sprint-management',
  imports: [
    PageHeader,
    Panel,
    Button,
    Chip,
    Icon,
    DataTable,
    DataTableCell,
    ConfirmInline,
    EmptyState,
    ErrorState,
    BurndownChart,
    SprintCreate,
    SprintSettings,
    VelocityHistory,
  ],
  templateUrl: './sprint-management.html',
  host: { class: 'mx-auto flex max-w-5xl flex-col gap-4' },
})
export class SprintManagement {
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  private readonly context = inject(ProjectContextService);

  protected readonly canAdminister = inject(Permissions).canAdminister;

  protected readonly columns: readonly DataTableColumn<Sprint>[] = [
    { header: 'Nombre' },
    { header: 'Estado' },
    { header: 'Fechas' },
    { header: 'Plan.', numeric: true },
    { header: 'Compl.', numeric: true },
    { header: 'Acciones' },
  ];
  protected readonly trackBySprint = (sprint: Sprint) => sprint.sprintCode;

  /** The sprint whose closing is being confirmed, whether the new-sprint form is open, and whether a change is in flight (one at a time). */
  protected readonly confirmingClose = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly busy = signal(false);
  private readonly pickedBurndown = signal<string | null>(null);

  protected readonly projects = this.context.projects;
  protected readonly selectedProject = this.context.current;
  private readonly projectCode = computed(() => this.selectedProject()?.projectCode);

  protected readonly sprints = rxResource({
    params: () => this.projectCode(),
    stream: ({ params }) => this.projectService.sprints(params),
  });
  protected readonly history = rxResource({
    params: () => this.projectCode(),
    stream: ({ params }) => this.projectService.velocityHistory(params, HISTORY_SPRINTS),
  });

  /** Newest first: what people came for is the current and the next sprints. */
  protected readonly loadedSprints = computed(() =>
    [...(valueOf(this.sprints) ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );
  protected readonly loadedHistory = computed(() => valueOf(this.history));
  /** A project has one active sprint at a time, so starting another is refused until it is closed. */
  protected readonly hasActiveSprint = computed(() => this.loadedSprints().some((sprint) => sprint.status === 'ACTIVE'));
  protected readonly closing = computed(() => this.loadedSprints().find((sprint) => sprint.sprintCode === this.confirmingClose()) ?? null);

  /** The sprint whose burndown is shown: the one picked, else the active one, else the latest that has begun. */
  protected readonly burndownSprint = computed(() => {
    const started = this.loadedSprints().filter((sprint) => sprint.status !== 'PLANNED');
    return (
      started.find((sprint) => sprint.sprintCode === this.pickedBurndown()) ??
      started.find((sprint) => sprint.status === 'ACTIVE') ??
      started[0] ??
      null
    );
  });
  /** Fetched again when the sprint changes state (starting or closing writes burndown rows), not on every reload. */
  protected readonly burndown = rxResource({
    params: () => {
      const sprint = this.burndownSprint();
      return sprint ? { code: sprint.sprintCode, status: sprint.status } : undefined;
    },
    stream: ({ params }) => this.projectService.burndown(params.code),
  });
  protected readonly loadedBurndown = computed(() => valueOf(this.burndown));

  /** Hours above (positive) or below the ideal line at the last day that has data, for the chip beside the chart. */
  protected readonly paceGap = computed(() => {
    const point = this.latestPoint(this.loadedBurndown());
    return point ? Math.round((point.remainingHours! - point.idealRemainingHours) * 10) / 10 : null;
  });

  protected label(sprint: Sprint): string {
    return SPRINT_STATUS_LABELS[sprint.status];
  }

  protected tone(sprint: Sprint): ChipTone {
    return SPRINT_STATUS_TONES[sprint.status];
  }

  protected dates(sprint: Sprint): string {
    return dateRange(sprint.startDate, sprint.endDate);
  }

  protected showBurndown(sprint: Sprint): void {
    this.pickedBurndown.set(sprint.sprintCode);
  }

  protected onCreated(): void {
    this.creating.set(false);
    this.sprints.reload();
  }

  protected start(sprint: Sprint): void {
    this.run(this.projectService.startSprint(sprint.sprintCode), `${sprint.name} está en marcha.`, 'No se pudo iniciar el sprint.');
  }

  protected close(sprint: Sprint): void {
    this.confirmingClose.set(null);
    this.run(
      this.projectService.closeSprint(sprint.sprintCode),
      `${sprint.name} se cerró. Su velocidad y su burndown quedaron fijos.`,
      'No se pudo cerrar el sprint.',
    );
  }

  private latestPoint(burndown: Burndown | undefined) {
    return [...(burndown?.points ?? [])].reverse().find((point) => point.day >= 1 && point.remainingHours != null);
  }

  private run(change: Observable<unknown>, success: string, failure: string): void {
    this.busy.set(true);
    change.subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success(success);
        this.sprints.reload();
        this.history.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notifications.error(apiErrorMessage(error, failure));
        this.sprints.reload(); // someone else may have changed it first
      },
    });
  }
}
