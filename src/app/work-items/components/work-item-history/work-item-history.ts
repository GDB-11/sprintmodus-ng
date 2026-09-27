import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, filter, forkJoin, map, merge, Subject, switchMap } from 'rxjs';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { SprintNames } from '../../models/history-description';
import { HistoryEntry } from '../../models/work-item.models';
import { HistoryService } from '../../services/history.service';
import { HistoryEntryView } from '../history-entry/history-entry';

const PAGE_SIZE = 20;
const SECONDARY_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-3 py-1.5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';

/**
 * The timeline of a work item, newest change first, behind a disclosure so that it is only fetched for whoever asks for it.
 * While it is open it follows the item: `version` changes when this page changed something, and the live board says when
 * somebody else did. A refresh fetches again as many pages as are on screen, so nothing that was opened is closed.
 */
@Component({
  selector: 'app-work-item-history',
  imports: [HistoryEntryView],
  templateUrl: './work-item-history.html',
})
export class WorkItemHistory {
  private readonly history = inject(HistoryService);
  private readonly board = inject(BoardWebSocketService);

  readonly workItemCode = input.required<string>();
  /** Anything that changes when the page has changed the item; an open history is fetched again. */
  readonly version = input<unknown>();
  readonly sprintNames = input<SprintNames>({});

  protected readonly buttonClasses = SECONDARY_BUTTON_CLASSES;
  protected readonly open = signal(false);
  protected readonly entries = signal<readonly HistoryEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  protected readonly hasMore = computed(() => this.entries().length < this.total());

  /** Pages on screen; a refresh fetches them all again. */
  private pages = 0;
  private shownFor: string | undefined;

  /** What to fetch: everything on screen again (a refresh), or the next page (show more). A newer request replaces an older one. */
  private readonly requests = new Subject<'refresh' | 'more'>();

  constructor() {
    this.requests
      .pipe(
        switchMap((kind) => {
          this.loading.set(true);
          this.failed.set(false);
          const code = this.workItemCode();
          const first = kind === 'more' ? this.pages : 0;
          const count = kind === 'more' ? 1 : Math.max(this.pages, 1);
          const pages = Array.from({ length: count }, (_, index) => first + index);
          return forkJoin(pages.map((page) => this.history.list(code, page, PAGE_SIZE))).pipe(
            map((results) => ({ kind, results })),
            catchError(() => {
              // keep what is on screen and offer a retry
              this.failed.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ kind, results }) => {
        const fetched = results.flatMap((page) => page.items);
        this.entries.update((shown) => (kind === 'more' ? [...shown, ...fetched] : fetched));
        this.pages = kind === 'more' ? this.pages + 1 : results.length;
        this.total.set(results[results.length - 1].total);
        this.loading.set(false);
      });

    effect(() => {
      const code = this.workItemCode();
      this.version();
      untracked(() => {
        if (code !== this.shownFor) {
          this.shownFor = code;
          this.pages = 0;
          this.entries.set([]);
          this.total.set(0);
        }
        this.refreshIfOpen();
      });
    });

    merge(this.board.statusChanged$, this.board.itemMoved$, this.board.commentAdded$)
      .pipe(
        filter((event) => event.workItemCode === this.workItemCode()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.refreshIfOpen());
    this.board.refresh$.pipe(takeUntilDestroyed()).subscribe(() => this.refreshIfOpen());
  }

  protected toggle(): void {
    this.open.update((open) => !open);
    this.refreshIfOpen(); // whatever happened while it was closed
  }

  protected retry(): void {
    this.requests.next('refresh');
  }

  protected showMore(): void {
    this.requests.next('more');
  }

  private refreshIfOpen(): void {
    if (this.open()) {
      this.requests.next('refresh');
    }
  }
}
