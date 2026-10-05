import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { merge, auditTime } from 'rxjs';
import { ConnectionIndicator } from '../../../shared/layout/connection-indicator/connection-indicator';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { valueOf } from '../../../shared/resource-value';
import { Button } from '../../../shared/ui/button/button';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { FilterChip } from '../../../shared/ui/filter-chip/filter-chip';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { SearchField } from '../../../shared/ui/search-field/search-field';
import { SegmentedControl, SegmentedOption } from '../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  ItemType,
  PRIORITY_LABELS,
  WorkItemSummary,
} from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { PriorityChip } from '../priority-chip/priority-chip';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemTreeNode } from '../work-item-tree-node/work-item-tree-node';
import { WorkItemTypeIcon } from '../work-item-type-icon/work-item-type-icon';

const PAGE_SIZE = 25;
const RELOAD_DEBOUNCE_MS = 500;
/** How many project items ground the Árbol view's roots (every Epic) and its "Sin épica" group; same cap as every
 * other "the whole project" fetch in this app (the parent picker, the links search candidates...). */
const TREE_SOURCE_SIZE = 200;

type View = 'tree' | 'list';

const VIEW_OPTIONS: SegmentedOption<View>[] = [
  { value: 'tree', label: 'Árbol' },
  { value: 'list', label: 'Lista' },
];

const LISTA_COLUMNS: DataTableColumn<WorkItemSummary>[] = [
  { header: 'Clave' },
  { header: 'Título', cell: (item) => item.title },
  { header: 'Tipo', cell: (item) => ITEM_TYPE_LABELS[item.type] },
  { header: 'Estado' },
  { header: 'Prioridad' },
  { header: 'Puntos', numeric: true, cell: (item) => `${item.effortPoints}` },
];

/**
 * The work items of one project (from the shell's project), in three views: Árbol (roots = the Epics, plus a
 * "Sin épica" group), Lista (the paginated table; also what a text search switches to) and Vista general (its own
 * route, `/work-items/overview`). It follows the project's live board: a status change elsewhere reloads what's shown.
 */
@Component({
  selector: 'app-work-item-list',
  imports: [
    RouterLink,
    ConnectionIndicator,
    PageHeader,
    Button,
    TextLink,
    SearchField,
    FilterChip,
    SegmentedControl,
    EmptyState,
    ErrorState,
    Skeleton,
    WorkItemTreeNode,
    WorkItemTypeIcon,
    DataTable,
    DataTableCell,
    StatusLabel,
    PriorityChip,
  ],
  templateUrl: './work-item-list.html',
})
export class WorkItemList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly board = inject(BoardWebSocketService);
  protected readonly projectContext = inject(ProjectContextService);

  protected readonly itemTypes = ITEM_TYPES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly viewOptions = VIEW_OPTIONS;
  protected readonly listaColumns = LISTA_COLUMNS;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly selectedProject = this.projectContext.current;

  protected readonly type = computed<ItemType | null>(() => {
    const type = this.queryParams().get('type');
    return ITEM_TYPES.find((known) => known === type) ?? null;
  });

  protected readonly query = computed(() => this.queryParams().get('q') ?? '');
  /** The search box's own value: starts in sync with the URL, but the user may edit it before submitting. */
  protected readonly queryDraft = linkedSignal(() => this.query());

  /** An explicit `?view=` always wins; otherwise a search shows Lista and everything else shows Árbol. */
  protected readonly view = computed<View>(() => {
    const requested = this.queryParams().get('view');
    if (requested === 'tree' || requested === 'list') {
      return requested;
    }
    return this.query() ? 'list' : 'tree';
  });

  protected readonly page = computed(() => {
    const page = Number(this.queryParams().get('page'));
    return Number.isInteger(page) && page > 0 ? page : 0;
  });

  /** Lista's own paginated page of results; only fetched while Lista is the active view. */
  protected readonly items = rxResource({
    params: () => {
      const project = this.selectedProject();
      return project && this.view() === 'list'
        ? { projectCode: project.projectCode, type: this.type() ?? undefined, q: this.query() || undefined, page: this.page() }
        : undefined;
    },
    stream: ({ params }) => this.workItems.list({ ...params, size: PAGE_SIZE }),
  });

  /** Every item of the project (capped), source for Árbol's roots and its "Sin épica" group. */
  protected readonly treeSource = rxResource({
    params: () => {
      const project = this.selectedProject();
      return project && this.view() === 'tree'
        ? { projectCode: project.projectCode, size: TREE_SOURCE_SIZE }
        : undefined;
    },
    stream: ({ params }) => this.workItems.list(params),
  });

  protected readonly roots = computed(() => (valueOf(this.treeSource)?.items ?? []).filter((item) => item.type === 'EPIC'));
  protected readonly orphans = computed(() =>
    (valueOf(this.treeSource)?.items ?? []).filter((item) => item.type !== 'EPIC' && !item.parentCode),
  );
  protected readonly treeTotal = computed(() => valueOf(this.treeSource)?.total ?? 0);
  protected readonly treeTruncated = computed(() => this.treeTotal() > TREE_SOURCE_SIZE);

  protected readonly loadedItems = computed(() => valueOf(this.items));
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil((valueOf(this.items)?.total ?? 0) / PAGE_SIZE)));
  protected readonly firstShown = computed(() => this.page() * PAGE_SIZE + 1);
  protected readonly lastShown = computed(() => Math.min((this.page() + 1) * PAGE_SIZE, valueOf(this.items)?.total ?? 0));

  constructor() {
    // A burst of changes (a card dragged across three columns) is one reload
    merge(this.board.statusChanged$, this.board.itemMoved$, this.board.refresh$)
      .pipe(auditTime(RELOAD_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => {
        this.items.reload();
        this.treeSource.reload();
      });
  }

  protected selectType(type: ItemType | null): void {
    this.navigate({ type, page: null });
  }

  protected onQueryDraft(value: string): void {
    this.queryDraft.set(value);
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.navigate({ q: this.queryDraft().trim() || null, page: null });
  }

  protected setView(view: View): void {
    this.navigate({ view: view === 'tree' ? null : view });
  }

  protected trackByCode(item: WorkItemSummary): string {
    return item.workItemCode;
  }

  /** Indexing `typeLabels` from a `let-item` template variable (an ng-template's context is untyped) needs a typed
   * parameter to go through, unlike a plain `@for` loop variable. */
  protected typeLabel(type: ItemType): string {
    return ITEM_TYPE_LABELS[type];
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
