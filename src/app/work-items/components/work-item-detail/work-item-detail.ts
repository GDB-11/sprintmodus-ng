import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { filter, map, merge, Observable } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { Permissions } from '../../../auth/services/permissions.service';
import { ConnectionIndicator } from '../../../shared/layout/connection-indicator/connection-indicator';
import { ItemMovedEvent, StatusChangedEvent } from '../../../board/models/board.models';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmInline } from '../../../shared/ui/confirm-inline/confirm-inline';
import { Control } from '../../../shared/ui/control/control';
import { DisabledReason } from '../../../shared/ui/disabled-reason/disabled-reason';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import {
  ASSIGNMENT_ROLE_LABELS,
  ITEM_TYPE_LABELS,
  PRIORITY_LABELS,
  WorkItem,
  WorkItemSummary,
} from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { CriteriaList } from '../criteria-list/criteria-list';
import { MetaList, MetaRow } from '../meta-list/meta-list';
import { WorkItemComments } from '../work-item-comments/work-item-comments';
import { WorkItemEdit } from '../work-item-edit/work-item-edit';
import { WorkItemHeader, WorkItemHeaderData } from '../work-item-header/work-item-header';
import { WorkItemHistory } from '../work-item-history/work-item-history';
import { WorkItemLinks } from '../work-item-links/work-item-links';
import { WorkItemRow } from '../work-item-row/work-item-row';

/**
 * One work item: its fields, the controls that change its status (only legal transitions are offered), sprint and parent,
 * its children, and its comments. Every change goes to the backend; the item shown is always the backend's answer. While the
 * page is open it follows the project's live board: when someone else changes this item's status it is reloaded (after the
 * current edit, if one is in progress, so nobody loses what they were typing).
 */
@Component({
  selector: 'app-work-item-detail',
  imports: [
    RouterLink,
    DatePipe,
    Button,
    ConfirmInline,
    Control,
    DisabledReason,
    Disclosure,
    EmptyState,
    ErrorState,
    Panel,
    TextLink,
    CriteriaList,
    MetaList,
    WorkItemHeader,
    WorkItemRow,
    WorkItemEdit,
    WorkItemLinks,
    WorkItemComments,
    WorkItemHistory,
    ConnectionIndicator,
  ],
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

  /** Changes whenever this page changes something about the item, so an open history is fetched again. */
  protected readonly historyVersion = signal(0);

  /** Sprint names by code, so the history can say where an item came from. */
  protected readonly sprintNames = computed(() =>
    Object.fromEntries((valueOf(this.sprints) ?? []).map((sprint) => [sprint.sprintCode, sprint.name])),
  );

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

  /** Root first, immediate parent last; built from `parents` (already loaded for the "Elemento superior" picker), not a
   * separate request. Stops at the first code that page doesn't have (truncated, or an item in another project). */
  protected readonly ancestors = computed<WorkItemSummary[]>(() => {
    const byCode = new Map((valueOf(this.parents)?.items ?? []).map((item) => [item.workItemCode, item]));
    const chain: WorkItemSummary[] = [];
    const seen = new Set<string>();
    let code = this.loadedItem()?.parentCode;
    while (code && byCode.has(code) && !seen.has(code)) {
      seen.add(code);
      const parent = byCode.get(code)!;
      chain.unshift(parent);
      code = parent.parentCode;
    }
    return chain;
  });

  protected readonly headerData = computed<WorkItemHeaderData | null>(() => {
    const item = this.loadedItem();
    if (!item) {
      return null;
    }
    return {
      type: item.type,
      displayKey: item.displayKey,
      status: item.status,
      title: item.title,
      priority: item.priority,
      sprintLabel: this.sprintName(),
      effortLabel: `${item.effortPoints} pts`,
    };
  });

  protected readonly metaRows = computed<MetaRow[]>(() => {
    const item = this.loadedItem();
    if (!item) {
      return [];
    }
    const assignedText =
      item.assignees.length === 0
        ? 'Nadie'
        : item.assignees.map((a) => `${a.fullName} (${this.roleLabels[a.role]})`).join(', ');
    return [
      { label: 'Asignado', value: assignedText },
      { label: 'Relaciones', value: item.links.length === 0 ? 'Sin relaciones' : `${item.links.length}` },
      { label: 'Creado', value: item.createdBy?.fullName ?? 'Usuario desconocido' },
    ];
  });

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

  protected onRelationsChanged(): void {
    this.bumpHistory();
    this.item.reload();
  }

  protected bumpHistory(): void {
    this.historyVersion.update((version) => version + 1);
  }

  protected onSaved(item: WorkItem): void {
    this.item.set(item);
    this.bumpHistory();
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
        this.bumpHistory();
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
