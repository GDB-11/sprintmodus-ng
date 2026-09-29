import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  model,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Subject, debounceTime, filter } from 'rxjs';
import { WorkItemSummary } from '../../../work-items/models/work-item.models';
import { WorkItemService } from '../../../work-items/services/work-item.service';
import { valueOf } from '../../resource-value';
import { Icon } from '../../ui/icon/icon';
import { NAV_ITEMS, NavItem } from '../nav-items';

const SEARCH_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 8;

type SearchOption =
  | { kind: 'nav'; id: string; navItem: NavItem }
  | { kind: 'workitem'; id: string; workItem: WorkItemSummary }
  | { kind: 'create'; id: string };

/**
 * The Ctrl/Cmd+K command palette: work items by key/title (debounced, the existing `q` search) and "ir a…" entries from
 * `NAV_ITEMS`, as a combobox/listbox. A native `<dialog>` supplies the focus trap, Escape and initial focus for free.
 */
@Component({
  selector: 'app-global-search',
  imports: [Icon],
  templateUrl: './global-search.html',
  host: {
    '(document:keydown)': 'onGlobalKeydown($event)',
  },
})
export class GlobalSearch {
  private readonly workItems = inject(WorkItemService);
  private readonly router = inject(Router);

  @ViewChild('dialogEl') private readonly dialogEl?: ElementRef<HTMLDialogElement>;

  readonly open = model(false);
  protected readonly listboxId = 'global-search-listbox';

  protected readonly query = signal('');
  private readonly queryInput = new Subject<string>();
  private readonly debouncedQuery = toSignal(this.queryInput.pipe(debounceTime(SEARCH_DEBOUNCE_MS)), { initialValue: '' });

  private readonly results = rxResource({
    params: () => {
      const text = this.debouncedQuery().trim();
      return text.length > 0 ? { q: text } : undefined;
    },
    stream: ({ params }) => this.workItems.list({ q: params.q, size: RESULT_LIMIT }),
  });
  protected readonly isLoading = computed(() => this.results.isLoading());
  protected readonly hasError = computed(() => !!this.results.error());

  private readonly navOptions = computed<SearchOption[]>(() => {
    const text = this.query().trim().toLowerCase();
    const items = text ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(text)) : NAV_ITEMS;
    return items.map((item, index) => ({ kind: 'nav', id: `gs-nav-${index}`, navItem: item }) as const);
  });
  private readonly workItemOptions = computed<SearchOption[]>(() =>
    (valueOf(this.results)?.items ?? []).map((item, index) => ({ kind: 'workitem', id: `gs-wi-${index}`, workItem: item }) as const),
  );
  private readonly createOption: SearchOption = { kind: 'create', id: 'gs-create' };

  protected readonly options = computed<SearchOption[]>(() => [...this.workItemOptions(), ...this.navOptions(), this.createOption]);

  protected readonly activeIndexRaw = signal(0);
  protected readonly activeIndex = computed(() => Math.max(0, Math.min(this.activeIndexRaw(), this.options().length - 1)));
  protected readonly activeOptionId = computed(() => this.options()[this.activeIndex()]?.id ?? null);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      untracked(() => {
        const dialog = this.dialogEl?.nativeElement;
        if (!isOpen) {
          this.query.set('');
          this.activeIndexRaw.set(0);
        }
        if (!dialog) {
          return;
        }
        if (isOpen && !dialog.open) {
          typeof dialog.showModal === 'function' ? dialog.showModal() : dialog.setAttribute('open', '');
        } else if (!isOpen && dialog.open) {
          typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open');
        }
      });
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  protected onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.open.set(true);
    }
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.activeIndexRaw.set(0);
    this.queryInput.next(value);
  }

  protected move(delta: number): void {
    const count = this.options().length;
    if (count === 0) {
      return;
    }
    this.activeIndexRaw.set((this.activeIndex() + delta + count) % count);
  }

  protected activate(): void {
    const option = this.options()[this.activeIndex()];
    if (option) {
      this.choose(option);
    }
  }

  protected choose(option: SearchOption): void {
    this.open.set(false);
    switch (option.kind) {
      case 'nav':
        void this.router.navigateByUrl(option.navItem.route);
        break;
      case 'workitem':
        void this.router.navigateByUrl(`/work-items/${option.workItem.workItemCode}`);
        break;
      case 'create':
        void this.router.navigateByUrl('/work-items/new');
        break;
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl?.nativeElement) {
      this.open.set(false);
    }
  }

  protected onNativeClose(): void {
    this.open.set(false);
  }
}
