import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Permissions } from '../../../auth/services/permissions.service';
import { SPRINT_STATUS_LABELS, Sprint } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { SprintCreate } from '../sprint-create/sprint-create';
import { SprintSettings } from '../sprint-settings/sprint-settings';
import { VelocityHistory } from '../velocity-history/velocity-history';

/** How many closed sprints the velocity history looks back over. */
export const HISTORY_SPRINTS = 6;

const SECONDARY_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';
const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';

/**
 * Sprints of one project: create them, start and close them, see how each is going and, over the last ones, how much the team
 * completes. Planning is for owners and admins; everyone else sees the same screen with those controls disabled and the reason.
 * Starting a sprint begins its burndown; closing one asks first, because it locks the sprint's velocity and burndown.
 */
@Component({
  selector: 'app-sprint-management',
  imports: [Page, RouterLink, DatePipe, SprintCreate, SprintSettings, VelocityHistory],
  templateUrl: './sprint-management.html',
})
export class SprintManagement {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  protected readonly canAdminister = inject(Permissions).canAdminister;
  protected readonly statusLabels = SPRINT_STATUS_LABELS;
  protected readonly secondaryButtonClasses = SECONDARY_BUTTON_CLASSES;
  protected readonly selectClasses = SELECT_CLASSES;

  /** The sprint whose closing is being confirmed, and whether a change is in flight (one at a time). */
  protected readonly confirmingClose = signal<string | null>(null);
  protected readonly busy = signal(false);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly projects = rxResource({ stream: () => this.projectService.list() });
  protected readonly loadedProjects = computed(() => valueOf(this.projects) ?? []);

  /** The project in the URL, or the first one. */
  protected readonly selectedProject = computed(() => {
    const projects = this.loadedProjects();
    const code = this.queryParams().get('project');
    return projects.find((project) => project.projectCode === code) ?? projects[0] ?? null;
  });
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

  protected selectProject(event: Event): void {
    this.confirmingClose.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { project: (event.target as HTMLSelectElement).value },
      queryParamsHandling: 'merge',
    });
  }

  protected onCreated(): void {
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
