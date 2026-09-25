import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { valueOf } from '../../../shared/resource-value';
import { StatusLabel } from '../../../work-items/components/status-label/status-label';
import { ITEM_TYPE_LABELS, WorkItemSummary } from '../../../work-items/models/work-item.models';
import { WorkItemService } from '../../../work-items/services/work-item.service';
import { assigneesText, childrenText } from '../../models/card-text';
import { ItemMovedEvent, StatusChangedEvent } from '../../models/board.models';
import { BoardWebSocketService } from '../../services/board-websocket.service';

/**
 * The children of one work item as a collapsible tree, loaded when it is first shown (an item with hundreds of
 * descendants costs nothing until someone opens it). Each child that has children of its own can be opened in turn. Statuses
 * follow the live board, and everything reloads when the board asks for it.
 */
@Component({
  selector: 'app-card-children',
  imports: [RouterLink, StatusLabel, CardChildren],
  templateUrl: './card-children.html',
})
export class CardChildren {
  private readonly workItems = inject(WorkItemService);
  private readonly board = inject(BoardWebSocketService);

  readonly parentCode = input.required<string>();

  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly assigneesText = assigneesText;
  protected readonly childrenText = childrenText;

  protected readonly children = rxResource({
    params: () => this.parentCode(),
    stream: ({ params }) => this.workItems.list({ parentCode: params, sort: 'board', size: 200 }),
  });

  /** What is shown: the loaded children, with the status changes that arrived since. */
  protected readonly nodes = linkedSignal<WorkItemSummary[]>(() => valueOf(this.children)?.items ?? []);
  protected readonly loading = computed(() => this.children.status() === 'loading');
  private readonly expandedCodes = signal<ReadonlySet<string>>(new Set());

  constructor() {
    merge(this.board.itemMoved$, this.board.statusChanged$)
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.applyStatus(event));
    this.board.refresh$.pipe(takeUntilDestroyed()).subscribe(() => this.children.reload());
  }

  protected isExpanded(node: WorkItemSummary): boolean {
    return this.expandedCodes().has(node.workItemCode);
  }

  protected toggle(node: WorkItemSummary): void {
    this.expandedCodes.update((codes) => {
      const next = new Set(codes);
      if (!next.delete(node.workItemCode)) {
        next.add(node.workItemCode);
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
