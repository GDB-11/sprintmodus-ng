import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { ITEM_TYPE_LABELS, PRIORITY_LABELS, WorkItem } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemComments } from '../work-item-comments/work-item-comments';
import { WorkItemEdit } from '../work-item-edit/work-item-edit';

const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';
const SECONDARY_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';

/**
 * One work item: its fields, the controls that change its status (only legal transitions are offered), sprint and parent,
 * its children, and its comments. Every change goes to the backend; the item shown is always the backend's answer.
 */
@Component({
  selector: 'app-work-item-detail',
  imports: [Page, RouterLink, DatePipe, StatusLabel, WorkItemEdit, WorkItemComments],
  templateUrl: './work-item-detail.html',
})
export class WorkItemDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  protected readonly selectClasses = SELECT_CLASSES;
  protected readonly secondaryButtonClasses = SECONDARY_BUTTON_CLASSES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

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
    this.notifications.success('Changes saved.');
  }

  protected delete(item: WorkItem): void {
    this.busy.set(true);
    this.workItems.delete(item.workItemCode).subscribe({
      next: () => {
        this.notifications.success(`${item.displayKey} was deleted.`);
        void this.router.navigate(['/work-items'], { queryParams: { project: item.projectCode } });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.confirmingDelete.set(false);
        this.notifications.error(apiErrorMessage(error, 'The work item could not be deleted.'));
      },
    });
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
        this.notifications.error(apiErrorMessage(error, 'The change could not be made.'));
        this.item.reload();
      },
    });
  }
}
