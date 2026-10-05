import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { ItemMovedEvent, StatusChangedEvent } from '../../../board/models/board.models';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { childrenText } from '../../../board/models/card-text';
import { valueOf } from '../../../shared/resource-value';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Icon } from '../../../shared/ui/icon/icon';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { WorkItemRowItem, WorkItemSummary } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { WorkItemRow } from '../work-item-row/work-item-row';

/**
 * One node of a work item hierarchy, recursive: a leaf renders just its row, a parent renders its row behind an
 * `aria-expanded` toggle button that mounts its children (by `parentCode`) the first time it opens and keeps their
 * status live off the project's board while it is connected — the same toggle every level of the tree used before
 * this component existed, kept so the interaction stays identical at every depth. `item` renders one node (used for
 * a tree's roots); `parentCode` alone renders the children of that code as a list of rows, recursing into a *new*
 * `app-work-item-tree-node` instance only for the next level down (one component boundary per list, not per row —
 * this is what the Kanban board's card children used to be `app-card-children` for, now the same component the Árbol
 * view uses for the rest of the tree).
 */
@Component({
  selector: 'app-work-item-tree-node',
  imports: [WorkItemRow, Icon, Skeleton, ErrorState, EmptyState, TextLink, WorkItemTreeNode],
  templateUrl: './work-item-tree-node.html',
})
export class WorkItemTreeNode {
  private readonly workItems = inject(WorkItemService);
  private readonly board = inject(BoardWebSocketService);

  /** Renders this one item, as a leaf or as a toggle over its own children. */
  readonly item = input<WorkItemRowItem & { childCount?: number }>();
  /** Renders the children of this code as a list of rows. */
  readonly parentCode = input<string>();

  /** `item` mode's own open state. */
  protected readonly ownOpened = signal(false);
  /** `parentCode` mode's per-row open state, by code. */
  private readonly expandedCodes = signal<ReadonlySet<string>>(new Set());
  protected readonly childrenText = childrenText;

  protected readonly children = rxResource({
    params: () => this.parentCode(),
    stream: ({ params }) => this.workItems.list({ parentCode: params, sort: 'board', size: 200 }),
  });

  /** What is shown: the loaded children, with the status changes that arrived since. */
  protected readonly nodes = linkedSignal<WorkItemSummary[]>(() => valueOf(this.children)?.items ?? []);
  protected readonly loadingChildren = computed(() => this.children.status() === 'loading');

  constructor() {
    merge(this.board.itemMoved$, this.board.statusChanged$)
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.applyStatus(event));
    this.board.refresh$.pipe(takeUntilDestroyed()).subscribe(() => this.children.reload());
  }

  protected isExpanded(code: string): boolean {
    return this.expandedCodes().has(code);
  }

  protected toggleChild(code: string): void {
    this.expandedCodes.update((codes) => {
      const next = new Set(codes);
      if (!next.delete(code)) {
        next.add(code);
      }
      return next;
    });
  }

  private applyStatus(event: StatusChangedEvent | ItemMovedEvent): void {
    if (this.nodes().some((node) => node.workItemCode === event.workItemCode)) {
      this.nodes.update((nodes) =>
        nodes.map((node) => (node.workItemCode === event.workItemCode ? { ...node, status: event.status } : node)),
      );
    }
  }
}
