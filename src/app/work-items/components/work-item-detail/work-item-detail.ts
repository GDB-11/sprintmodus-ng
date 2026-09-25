import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { filter, map, merge, Observable } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { Permissions } from '../../../auth/services/permissions.service';
import { BoardConnection } from '../../../board/components/board-connection/board-connection';
import { ItemMovedEvent, StatusChangedEvent } from '../../../board/models/board.models';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { ASSIGNMENT_ROLE_LABELS, ITEM_TYPE_LABELS, PRIORITY_LABELS, WorkItem } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemComments } from '../work-item-comments/work-item-comments';
import { WorkItemEdit } from '../work-item-edit/work-item-edit';
import { WorkItemLinks } from '../work-item-links/work-item-links';

const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';
const SECONDARY_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';

/**
 * One work item: its fields, the controls that change its status (only legal transitions are offered), sprint and parent,
 * its children, and its comments. Every change goes to the backend; the item shown is always the backend's answer. While the
 * page is open it follows the project's live board: when someone else changes this item's status it is reloaded (after the
 * current edit, if one is in progress, so nobody loses what they were typing).
 */
@Component({
  selector: 'app-work-item-detail',
  imports: [Page, RouterLink, DatePipe, StatusLabel, WorkItemEdit, WorkItemLinks, WorkItemComments, BoardConnection],
  templateUrl: './work-item-detail.html',
})
export class WorkItemDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  private readonly board = inject(BoardWebSocketService);
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(Permissions);

  protected readonly selectClasses = SELECT_CLASSES;
  protected readonly secondaryButtonClasses = SECONDARY_BUTTON_CLASSES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly roleLabels = ASSIGNMENT_ROLE_LABELS;

  protected readonly editing = signal(false);
  protected readonly confirmingDelete = signal(false);
  /** True while a change is in flight, so the controls cannot fire a second one over it. */
  protected readonly busy = signal(false);

  private readonly code = toSignal(this.route.paramMap.pipe(map((params) => params.get('code'))), {
    requireSync: true,
  });

  protected readonly item = rxResource({
    params: () => this.code() ?? undefined,
    stream: ({ params }) => this.workItems.get(params),
  });

  /** The item once loaded; `undefined` while loading or after a failed load. */
  protected readonly loadedItem = computed(() => valueOf(this.item));

  /** Its own signal: the item is replaced after every change, and that must not reload the sprints and parents. */
  private readonly projectCode = computed(() => this.loadedItem()?.projectCode);

  protected readonly sprints = rxResource({
    params: () => this.projectCode(),
    stream: ({ params }) => this.projectService.sprints(params),
  });

  protected readonly parents = rxResource({
    params: () => this.projectCode(),
    stream: ({ params }) => this.workItems.list({ projectCode: params, size: 200 }),
  });

  /** Planning work into sprints is for owners and admins; everyone else sees the sprint but cannot change it. */
  protected readonly canPlanSprints = this.permissions.canAdminister;

  /** Where the item is, in words, for those who cannot change it. */
  protected readonly sprintName = computed(() => {
    const code = this.loadedItem()?.sprintCode;
    if (!code) {
      return 'Backlog (sin sprint)';
    }
    return (valueOf(this.sprints) ?? []).find((sprint) => sprint.sprintCode === code)?.name ?? 'Sprint';
  });

  protected canDelete(item: WorkItem): boolean {
    return this.permissions.canDelete(item);
  }

  /** Sprints the item can be put in: the ones still open, plus the one it is in now. */
  protected readonly sprintChoices = computed(() => {
    const currentSprint = this.loadedItem()?.sprintCode;
    return (valueOf(this.sprints) ?? []).filter(
      (sprint) => sprint.status !== 'CLOSED' || sprint.sprintCode === currentSprint,
    );
  });

  /** Every other item of the project; the backend refuses a cycle or another project's item with a clear message. */
  protected readonly parentChoices = computed(() => {
    const self = this.loadedItem()?.workItemCode;
    return (valueOf(this.parents)?.items ?? []).filter((candidate) => candidate.workItemCode !== self);
  });

  /** Set when the item changed elsewhere while it was being edited; it is reloaded as soon as the edit ends. */
  private changedWhileEditing = false;

  constructor() {
    merge(this.board.statusChanged$, this.board.itemMoved$)
      .pipe(
        filter((event) => event.workItemCode === this.code()),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.onRemoteStatusChange(event));
    this.board.refresh$.pipe(takeUntilDestroyed()).subscribe(() => this.refreshFromServer());
    effect(() => {
      if (!this.editing() && this.changedWhileEditing) {
        this.changedWhileEditing = false;
        untracked(() => this.item.reload());
      }
    });
  }

  protected changeStatus(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value;
    select.value = '';
    if (status) {
      this.run(this.workItems.changeStatus(this.loadedItem()!.workItemCode, status));
    }
  }

  protected moveToSprint(event: Event, item: WorkItem): void {
    const select = event.target as HTMLSelectElement;
    const previous = item.sprintCode ?? '';
    this.run(this.workItems.moveToSprint(item.workItemCode, select.value || null), () => {
      select.value = previous;
    });
  }

  protected changeParent(event: Event, item: WorkItem): void {
    const select = event.target as HTMLSelectElement;
    const previous = item.parentCode ?? '';
    this.run(this.workItems.updateParent(item.workItemCode, select.value || null), () => {
      select.value = previous;
    });
  }

  protected onSaved(item: WorkItem): void {
    this.item.set(item);
    this.editing.set(false);
    this.notifications.success('Cambios guardados.');
  }

  protected delete(item: WorkItem): void {
    this.busy.set(true);
    this.workItems.delete(item.workItemCode).subscribe({
      next: () => {
        this.notifications.success(`${item.displayKey} se eliminó.`);
        void this.router.navigate(['/work-items'], { queryParams: { project: item.projectCode } });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.confirmingDelete.set(false);
        this.notifications.error(apiErrorMessage(error, 'No se pudo eliminar el elemento de trabajo.'));
      },
    });
  }

  private onRemoteStatusChange(event: StatusChangedEvent | ItemMovedEvent): void {
    if (this.loadedItem()?.status.code === event.status.code) {
      return; // already showing it: this is the echo of a change made on this page
    }
    const by = 'fromStatus' in event ? event.movedBy : event.changedBy;
    const who = by && by.userCode !== this.auth.getCurrentUser()?.id ? by.fullName : 'Alguien';
    this.notifications.info(
      this.editing()
        ? `${who} cambió el estado de ${event.displayKey} a ${event.status.displayName}. Lo verás al terminar de editar.`
        : `${who} cambió el estado de ${event.displayKey} a ${event.status.displayName}.`,
    );
    this.refreshFromServer();
  }

  private refreshFromServer(): void {
    if (this.editing()) {
      this.changedWhileEditing = true;
    } else {
      this.item.reload();
    }
  }

  /** Applies a change; on failure explains why and reloads, because someone else may have changed the item first. */
  private run(change: Observable<WorkItem>, onFailure?: () => void): void {
    this.busy.set(true);
    change.subscribe({
      next: (updated) => {
        this.item.set(updated);
        this.busy.set(false);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        onFailure?.();
        this.notifications.error(apiErrorMessage(error, 'No se pudo realizar el cambio.'));
        this.item.reload();
      },
    });
  }
}
