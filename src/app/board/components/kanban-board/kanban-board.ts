import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, auditTime, filter, merge } from 'rxjs';
import { Permissions } from '../../../auth/services/permissions.service';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { StatusLabel } from '../../../work-items/components/status-label/status-label';
import {
  AssignmentRole,
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  ItemType,
  PRIORITIES,
  PRIORITY_LABELS,
  Priority,
  WorkItemStatus,
  WorkItemSummary,
} from '../../../work-items/models/work-item.models';
import { WorkItemService } from '../../../work-items/services/work-item.service';
import { ItemMovedEvent, StatusChangedEvent } from '../../models/board.models';
import { compareForBoard, placeBefore, rankGroupOf } from '../../models/board-order';
import { BoardWebSocketService } from '../../services/board-websocket.service';
import { BoardConnection } from '../board-connection/board-connection';
import { KanbanCard, MoveOption } from '../kanban-card/kanban-card';
import { ALL_SPRINTS, BACKLOG, SprintFilter } from '../sprint-filter/sprint-filter';

/** The most cards the board loads for one project, type and sprint; a notice says so when there are more. */
export const BOARD_PAGE_SIZE = 200;
/** A burst of changes (a card dragged across three columns) is one reload. */
const RELOAD_DEBOUNCE_MS = 500;
/** How long a move sent over the socket may go without an answer (its echo or an error) before the board reloads. */
export const MOVE_TIMEOUT_MS = 8000;

const DEFAULT_TYPE: ItemType = 'PBI';
/** The value of the assignee filter for cards nobody works on. */
export const UNASSIGNED = 'none';
const NO_MOVES: readonly MoveOption[] = [];

const FIELD_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';

interface Column {
  status: WorkItemStatus;
  cards: WorkItemSummary[];
  points: number;
}

/** A transition out of a status, and the role it asks for, if any. */
interface Target {
  status: WorkItemStatus;
  requiredRole?: AssignmentRole;
}

/** A move the user made that the server has not confirmed yet: what to put back if it refuses. */
interface PendingMove {
  from: WorkItemStatus;
  to: string;
}

/**
 * The Kanban board of one project, item type and sprint: a column per status of the type's workflow, a card per work item.
 * <p>
 * Cards in a column are ordered by priority (critical first) and then by the manual order an owner or admin sets, by
 * dragging a card within its column or with the card's Subir/Bajar buttons; a card cannot leave its priority, only its place
 * inside it. Anyone can filter what is shown (sprint, priority, assignee, text); the filters only hide cards.
 * <p>
 * A card changes column by drag and drop, or with the "Mover a…" list on the card (dragging alone would exclude keyboard and
 * assistive-technology users). Only the workflow's legal transitions are offered, and those that ask for a role the user does
 * not hold are shown disabled. The server has the last word: a move is shown at once (optimistically) and reconciled against
 * what the server answers, by work item and status, never by arrival order. Other people's moves arrive over the live board and
 * are applied as they are, and the board reloads from the API whenever the live connection cannot be trusted (see
 * {@link BoardWebSocketService.refresh$}).
 */
@Component({
  selector: 'app-kanban-board',
  imports: [
    Page,
    RouterLink,
    StatusLabel,
    BoardConnection,
    SprintFilter,
    KanbanCard,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
  ],
  templateUrl: './kanban-board.html',
})
export class KanbanBoard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly projectService = inject(ProjectService);
  private readonly board = inject(BoardWebSocketService);
  private readonly notifications = inject(NotificationService);
  private readonly permissions = inject(Permissions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly fieldClasses = FIELD_CLASSES;
  protected readonly itemTypes = ITEM_TYPES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorities = PRIORITIES;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly pageSize = BOARD_PAGE_SIZE;
  protected readonly unassigned = UNASSIGNED;
  protected readonly canReorder = this.permissions.canAdminister;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly projects = rxResource({ stream: () => this.projectService.list() });
  protected readonly loadedProjects = computed(() => valueOf(this.projects) ?? []);

  /** The project in the URL, or the first one when the URL names none (or one that no longer exists). */
  protected readonly selectedProject = computed(() => {
    const projects = this.loadedProjects();
    const code = this.queryParams().get('project');
    return projects.find((project) => project.projectCode === code) ?? projects[0] ?? null;
  });
  private readonly projectCode = computed(() => this.selectedProject()?.projectCode);

  protected readonly type = computed<ItemType>(() => {
    const type = this.queryParams().get('type');
    return ITEM_TYPES.find((known) => known === type) ?? DEFAULT_TYPE;
  });

  protected readonly sprints = rxResource({
    params: () => this.projectCode(),
    stream: ({ params }) => this.projectService.sprints(params),
  });
  protected readonly loadedSprints = computed(() => valueOf(this.sprints) ?? []);

  /** The sprint in the URL if it exists, otherwise the current one, otherwise every sprint. */
  protected readonly selectedSprint = computed(() => {
    const wanted = this.queryParams().get('sprint');
    const sprints = this.loadedSprints();
    if (wanted === ALL_SPRINTS || wanted === BACKLOG || sprints.some((sprint) => sprint.sprintCode === wanted)) {
      return wanted!;
    }
    return sprints.find((sprint) => sprint.status === 'ACTIVE')?.sprintCode ?? ALL_SPRINTS;
  });
  /** Sprints are known (or failed to load) before items are asked for, so the first request is already the right one. */
  private readonly sprintsSettled = computed(() => this.sprints.status() === 'resolved' || this.sprints.status() === 'error');

  protected readonly priorityFilter = computed<Priority | null>(() => {
    const priority = this.queryParams().get('priority');
    return PRIORITIES.find((known) => known === priority) ?? null;
  });
  protected readonly assigneeFilter = computed(() => this.queryParams().get('assignee'));
  protected readonly search = signal('');

  /** Each item type has its own workflow, so a board shows one type at a time. */
  protected readonly workflow = rxResource({
    params: () => this.type(),
    stream: ({ params }) => this.workItems.workflow(params),
  });

  protected readonly items = rxResource({
    params: () => {
      const projectCode = this.projectCode();
      return projectCode && this.sprintsSettled()
        ? { projectCode, type: this.type(), sprint: this.selectedSprint() }
        : undefined;
    },
    stream: ({ params }) =>
      this.workItems.list({
        projectCode: params.projectCode,
        type: params.type,
        sprintCode: params.sprint === ALL_SPRINTS || params.sprint === BACKLOG ? undefined : params.sprint,
        backlog: params.sprint === BACKLOG ? true : undefined,
        sort: 'board',
        size: BOARD_PAGE_SIZE,
      }),
  });

  /** What the board holds: the loaded items, changed on screen by moves until the server has confirmed or refused them. */
  private readonly cards = linkedSignal<WorkItemSummary[]>(() => valueOf(this.items)?.items ?? []);
  private readonly pending = signal<ReadonlyMap<string, PendingMove>>(new Map());
  private readonly pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly unknownItems = new Subject<void>();
  /** True while an owner's or admin's reorder is on its way to the server; the next one waits for it. */
  protected readonly reordering = signal(false);

  /** The card being dragged, so the columns it may be dropped in can be shown. */
  protected readonly dragged = signal<WorkItemSummary | null>(null);
  /** Said to screen readers when a card moves: the card changing column is otherwise only visible. */
  protected readonly announcement = signal('');

  /** Statuses in workflow order. The first one is where items start, exactly as the backend decides it. */
  private readonly statuses = computed<WorkItemStatus[]>(() => {
    const workflow = valueOf(this.workflow);
    return [...(workflow?.statuses ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((status, index) => ({
        code: status.code,
        displayName: status.displayName,
        isInitial: index === 0,
        isTerminal: status.isTerminal,
      }));
  });

  /** Everyone working on a card of this board, for the assignee filter. */
  protected readonly assigneeOptions = computed(() => {
    const byCode = new Map<string, string>();
    for (const card of this.cards()) {
      for (const assignee of card.assignees) {
        byCode.set(assignee.userCode, assignee.fullName);
      }
    }
    return [...byCode].map(([userCode, fullName]) => ({ userCode, fullName })).sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

  /** The cards the filters let through. */
  protected readonly visibleCards = computed(() => {
    const priority = this.priorityFilter();
    const assignee = this.assigneeFilter();
    const text = this.search().trim().toLowerCase();
    return this.cards().filter(
      (card) =>
        (!priority || card.priority === priority) &&
        (!assignee ||
          (assignee === UNASSIGNED ? card.assignees.length === 0 : card.assignees.some((a) => a.userCode === assignee))) &&
        (!text ||
          card.title.toLowerCase().includes(text) ||
          card.displayKey.toLowerCase().includes(text) ||
          card.assignees.some((a) => a.fullName.toLowerCase().includes(text))),
    );
  });
  protected readonly filtering = computed(() => this.visibleCards().length !== this.cards().length);

  protected readonly columns = computed<Column[]>(() => {
    const cards = [...this.visibleCards()].sort(compareForBoard);
    return this.statuses().map((status) => {
      const inColumn = cards.filter((card) => card.status.code === status.code);
      return { status, cards: inColumn, points: inColumn.reduce((sum, card) => sum + card.effortPoints, 0) };
    });
  });

  /** Where an item may go from each status: forward along a transition, or back along one that allows it. */
  private readonly targets = computed(() => {
    const transitions = valueOf(this.workflow)?.transitions ?? [];
    const statuses = this.statuses();
    const targets = new Map<string, Target[]>();
    for (const status of statuses) {
      targets.set(
        status.code,
        statuses
          .filter((candidate) => candidate.code !== status.code)
          .flatMap((candidate) => {
            // The same rule the backend applies: the first transition that carries the move, forward or (if allowed) back
            const transition = transitions.find(
              (t) =>
                (t.from === status.code && t.to === candidate.code) ||
                (t.allowedBackward && t.from === candidate.code && t.to === status.code),
            );
            return transition ? [{ status: candidate, requiredRole: transition.requiredRole ?? undefined }] : [];
          }),
      );
    }
    return targets;
  });

  /** Per card, where it can go and whether this user may choose each. Computed once, so cards only re-render when it changes. */
  private readonly moveOptions = computed(() => {
    const options = new Map<string, MoveOption[]>();
    for (const card of this.cards()) {
      options.set(
        card.workItemCode,
        (this.targets().get(card.status.code) ?? []).map((target) => ({
          status: target.status,
          requiredRole: target.requiredRole,
          allowed: this.mayUse(target.requiredRole, card),
        })),
      );
    }
    return options;
  });

  /** Per card, whether it can go up or down inside its priority (owners and admins). */
  private readonly positions = computed(() => {
    const positions = new Map<string, { up: boolean; down: boolean }>();
    const cards = this.cards();
    for (const card of cards) {
      const group = rankGroupOf(cards, card);
      const index = group.findIndex((other) => other.workItemCode === card.workItemCode);
      positions.set(card.workItemCode, { up: index > 0, down: index < group.length - 1 });
    }
    return positions;
  });

  protected readonly loading = computed(
    () =>
      this.projects.status() === 'loading' ||
      this.sprints.status() === 'loading' ||
      this.workflow.status() === 'loading' ||
      this.items.status() === 'loading',
  );
  protected readonly failed = computed(() => !!(this.projects.error() || this.workflow.error() || this.items.error()));
  protected readonly notShownCount = computed(() => Math.max(0, (valueOf(this.items)?.total ?? 0) - BOARD_PAGE_SIZE));

  constructor() {
    merge(this.board.refresh$, this.board.itemsReordered$, this.unknownItems)
      .pipe(auditTime(RELOAD_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => this.items.reload());
    merge(this.board.itemMoved$, this.board.statusChanged$)
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.onRemoteChange(event));
    this.board.errors$
      .pipe(
        filter((error) => !!error.workItemCode && this.pending().has(error.workItemCode)),
        takeUntilDestroyed(),
      )
      .subscribe((error) => this.revert(error.workItemCode!, error.message));
    inject(DestroyRef).onDestroy(() => this.pendingTimers.forEach((timer) => clearTimeout(timer)));
  }

  protected selectProject(event: Event): void {
    this.navigate({ project: (event.target as HTMLSelectElement).value, sprint: null, priority: null, assignee: null });
  }

  protected selectType(event: Event): void {
    this.navigate({ type: (event.target as HTMLSelectElement).value });
  }

  protected selectSprint(sprint: string): void {
    this.navigate({ sprint });
  }

  protected selectPriority(event: Event): void {
    this.navigate({ priority: (event.target as HTMLSelectElement).value || null });
  }

  protected selectAssignee(event: Event): void {
    this.navigate({ assignee: (event.target as HTMLSelectElement).value || null });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.navigate({ priority: null, assignee: null });
  }

  protected movesOf(card: WorkItemSummary): readonly MoveOption[] {
    return this.moveOptions().get(card.workItemCode) ?? NO_MOVES;
  }

  protected isPending(card: WorkItemSummary): boolean {
    return this.pending().has(card.workItemCode);
  }

  protected canMoveUp(card: WorkItemSummary): boolean {
    return !this.reordering() && !!this.positions().get(card.workItemCode)?.up;
  }

  protected canMoveDown(card: WorkItemSummary): boolean {
    return !this.reordering() && !!this.positions().get(card.workItemCode)?.down;
  }

  /** Which sprint a card is in, when the board shows more than one sprint. */
  protected sprintLabelOf(card: WorkItemSummary): string | null {
    if (this.selectedSprint() !== ALL_SPRINTS) {
      return null;
    }
    return this.loadedSprints().find((sprint) => sprint.sprintCode === card.sprintCode)?.name ?? 'Backlog';
  }

  /** Whether the dragged card may be dropped in a column: any move this user may make, or staying where it is. */
  protected readonly canEnter = (drag: CdkDrag<WorkItemSummary>, drop: CdkDropList<string>): boolean =>
    drag.data.status.code === drop.data || this.movesOf(drag.data).some((move) => move.allowed && move.status.code === drop.data);

  protected isDropTarget(column: Column): boolean {
    const card = this.dragged();
    return !!card && card.status.code !== column.status.code && this.movesOf(card).some((m) => m.allowed && m.status.code === column.status.code);
  }

  protected onDrop(event: CdkDragDrop<string, string, WorkItemSummary>): void {
    this.dragged.set(null);
    const card = event.item.data;
    if (event.previousContainer !== event.container) {
      this.moveTo(card, event.container.data, false);
    } else if (this.canReorder() && event.previousIndex !== event.currentIndex) {
      // Dropped between two cards of the column. A card only moves inside its own priority, so it goes before the first card of
      // its priority that now follows it, or last in its priority if none does.
      const column = this.columns().find((candidate) => candidate.status.code === event.container.data);
      const following = (column?.cards ?? []).filter((other) => other !== card).slice(event.currentIndex);
      this.reorderBefore(card, following.find((other) => other.priority === card.priority)?.workItemCode ?? null);
    }
  }

  protected reorderStep(card: WorkItemSummary, direction: 'up' | 'down'): void {
    const group = rankGroupOf(this.cards(), card);
    const index = group.findIndex((other) => other.workItemCode === card.workItemCode);
    const before = direction === 'up' ? group[index - 1] : group[index + 2];
    this.reorderBefore(card, before?.workItemCode ?? null);
  }

  /** Puts `card` right before `beforeCode` in its priority (last if `null`): shown now, then sent; put back if refused. */
  private reorderBefore(card: WorkItemSummary, beforeCode: string | null): void {
    if (!this.canReorder() || this.reordering()) {
      return;
    }
    const group = rankGroupOf(this.cards(), card);
    const current = group.map((other) => other.workItemCode);
    const placed = placeBefore(current, card.workItemCode, beforeCode);
    if (placed.every((code, index) => code === current[index])) {
      return;
    }
    const previous = new Map(group.map((other) => [other.workItemCode, other.boardRank]));
    this.setRanks(new Map(placed.map((code, index) => [code, index + 1])));
    this.reordering.set(true);
    this.workItems.reorder(card.workItemCode, beforeCode).subscribe({
      next: () => {
        this.reordering.set(false);
        this.announce(`${card.displayKey} reubicado dentro de su prioridad.`);
      },
      error: (error: unknown) => {
        this.reordering.set(false);
        this.setRanks(previous);
        this.notifications.error(apiErrorMessage(error, `No se pudo reordenar ${card.displayKey}.`));
        this.items.reload();
      },
    });
  }

  /**
   * Shows the move now and asks the server for it: over the live connection when there is one, through the API otherwise.
   * `refocus` is for moves made from the card's own list: the card reappears in another column and focus would be lost.
   */
  protected moveTo(card: WorkItemSummary, statusCode: string, refocus: boolean): void {
    const target = this.movesOf(card).find((move) => move.allowed && move.status.code === statusCode)?.status;
    if (!target || this.isPending(card)) {
      return; // the workflow does not allow it, this user may not, or an earlier move of this card is still unanswered
    }
    const code = card.workItemCode;
    this.setPending(code, { from: card.status, to: target.code });
    this.setStatus(code, target);
    if (refocus) {
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-move-for="${code}"]`)?.focus(), {
        injector: this.injector,
      });
    }

    if (this.board.moveItem(code, target.code)) {
      // The echo of the move (or an error) settles it; if neither comes, the board is reloaded rather than left guessing
      this.pendingTimers.set(
        code,
        setTimeout(() => {
          if (this.pending().has(code)) {
            this.clearPending(code);
            this.notifications.warning(`No se confirmó el cambio de ${card.displayKey}. Se actualizó el tablero.`);
            this.items.reload();
          }
        }, MOVE_TIMEOUT_MS),
      );
      return;
    }
    this.workItems.changeStatus(code, target.code).subscribe({
      next: (updated) => {
        if (this.pending().has(code)) {
          this.clearPending(code);
          this.setStatus(code, updated.status, updated.updatedAt);
          this.announce(`${card.displayKey} movido a ${updated.status.displayName}.`);
        }
      },
      error: (error: unknown) => this.revert(code, apiErrorMessage(error, `No se pudo mover ${card.displayKey}.`)),
    });
  }

  /** Whether this user may make a move that asks for `role`: nothing asked, an owner/admin, or assigned to the card in that role. */
  private mayUse(role: AssignmentRole | undefined, card: WorkItemSummary): boolean {
    const me = this.permissions.userCode();
    return !role || this.permissions.canAdminister() || card.assignees.some((a) => a.role === role && a.userCode === me);
  }

  /** What the server says happened to an item, from anyone (this user's own moves come back as well). It is the truth. */
  private onRemoteChange(event: StatusChangedEvent | ItemMovedEvent): void {
    if (!this.cards().some((card) => card.workItemCode === event.workItemCode)) {
      this.unknownItems.next(); // another type's item, or one this board has not loaded yet: one reload tells which
      return;
    }
    this.setStatus(event.workItemCode, event.status, event.updatedAt);
    const own = this.pending().get(event.workItemCode);
    if (own?.to === event.status.code) {
      this.clearPending(event.workItemCode);
    }
    const by = 'fromStatus' in event ? event.movedBy : event.changedBy;
    const someoneElse = by && by.userCode !== this.permissions.userCode();
    this.announce(
      someoneElse
        ? `${by.fullName} movió ${event.displayKey} a ${event.status.displayName}.`
        : `${event.displayKey} movido a ${event.status.displayName}.`,
    );
  }

  /** The server refused a move (or could not be reached): puts the card back and says why. */
  private revert(workItemCode: string, message: string): void {
    const move = this.pending().get(workItemCode);
    if (!move) {
      return;
    }
    this.clearPending(workItemCode);
    this.setStatus(workItemCode, move.from);
    this.notifications.error(message);
    this.items.reload(); // someone else may have moved it first
  }

  /** A card that changes status joins the end of its new group: the server clears its rank, so does the board. */
  private setStatus(workItemCode: string, status: WorkItemStatus, updatedAt?: string): void {
    this.cards.update((cards) =>
      cards.map((card) =>
        card.workItemCode === workItemCode
          ? {
              ...card,
              status,
              updatedAt: updatedAt ?? card.updatedAt,
              boardRank: card.status.code === status.code ? card.boardRank : undefined,
            }
          : card,
      ),
    );
  }

  private setRanks(ranks: ReadonlyMap<string, number | undefined>): void {
    this.cards.update((cards) => cards.map((card) => (ranks.has(card.workItemCode) ? { ...card, boardRank: ranks.get(card.workItemCode) } : card)));
  }

  private setPending(workItemCode: string, move: PendingMove): void {
    this.pending.update((moves) => new Map(moves).set(workItemCode, move));
  }

  private clearPending(workItemCode: string): void {
    clearTimeout(this.pendingTimers.get(workItemCode));
    this.pendingTimers.delete(workItemCode);
    this.pending.update((moves) => {
      const remaining = new Map(moves);
      remaining.delete(workItemCode);
      return remaining;
    });
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
