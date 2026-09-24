import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../projects/services/project.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  ItemType,
  PRIORITY_LABELS,
} from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { StatusLabel } from '../status-label/status-label';

const PAGE_SIZE = 25;

const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';

/** The work items of one project, filtered by type and paged. The project, filter and page live in the URL. */
@Component({
  selector: 'app-work-item-list',
  imports: [Page, RouterLink, StatusLabel],
  templateUrl: './work-item-list.html',
})
export class WorkItemList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly projectService = inject(ProjectService);

  protected readonly selectClasses = SELECT_CLASSES;
  protected readonly itemTypes = ITEM_TYPES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly projects = rxResource({ stream: () => this.projectService.list() });

  /** The project in the URL, or the first one when the URL names none (or one that no longer exists). */
  protected readonly selectedProject = computed(() => {
    const projects = valueOf(this.projects) ?? [];
    const code = this.queryParams().get('project');
    return projects.find((project) => project.projectCode === code) ?? projects[0] ?? null;
  });

  protected readonly type = computed<ItemType | null>(() => {
    const type = this.queryParams().get('type');
    return ITEM_TYPES.find((known) => known === type) ?? null;
  });

  protected readonly page = computed(() => {
    const page = Number(this.queryParams().get('page'));
    return Number.isInteger(page) && page > 0 ? page : 0;
  });

  protected readonly items = rxResource({
    params: () => {
      const project = this.selectedProject();
      return project
        ? { projectCode: project.projectCode, type: this.type() ?? undefined, page: this.page() }
        : undefined;
    },
    stream: ({ params }) => this.workItems.list({ ...params, size: PAGE_SIZE }),
  });

  protected readonly loadedProjects = computed(() => valueOf(this.projects) ?? []);
  protected readonly loadedItems = computed(() => valueOf(this.items));

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((valueOf(this.items)?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly firstShown = computed(() => this.page() * PAGE_SIZE + 1);
  protected readonly lastShown = computed(() =>
    Math.min((this.page() + 1) * PAGE_SIZE, valueOf(this.items)?.total ?? 0),
  );

  protected selectProject(event: Event): void {
    this.navigate({ project: (event.target as HTMLSelectElement).value, type: null, page: null });
  }

  protected selectType(event: Event): void {
    this.navigate({ type: (event.target as HTMLSelectElement).value || null, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page > 0 ? page : null });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
