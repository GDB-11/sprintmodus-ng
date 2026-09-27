import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FieldTree, FormField } from '@angular/forms/signals';
import { catchError, map, of, startWith, switchMap, timer } from 'rxjs';
import { UserRef } from '../../../work-items/models/work-item.models';
import { findMentionQuery, insertMention, pickOf } from '../../models/mention-text';
import { UserService } from '../../services/user.service';

/** A person types a name, the search waits this long for a pause, and a failed or empty search is said, not shown. */
const SEARCH_DELAY_MS = 200;

type SearchState = 'idle' | 'loading' | 'done' | 'failed';

/**
 * A labelled textarea bound to a Signal Forms field, where typing `@` offers the organization's people and picking one puts
 * `@Full Name` in the text. Whom was picked goes out through `mentions` so the caller can turn the names into tokens on submit
 * (`toMentionTokens`); this component never shows a user code.
 *
 * Accessibility: a `<textarea>` may not take `role="combobox"` (ARIA in HTML), so it stays a textbox that owns a popup: it
 * says `aria-haspopup="listbox"` and `aria-autocomplete="list"`, points at the `role="listbox"` with `aria-controls` while
 * it is open and at the highlighted `role="option"` with `aria-activedescendant`, so focus never leaves the text. Arrow keys
 * move, Enter picks, Escape closes; a `role="status"` line says how many people were found and who was picked. A mouse pick
 * does not take focus from the textarea either.
 */
@Component({
  selector: 'app-mention-field',
  imports: [FormField],
  templateUrl: './mention-field.html',
})
export class MentionField {
  private readonly users = inject(UserService);
  private readonly injector = inject(Injector);

  readonly field = input.required<FieldTree<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly rows = input(4);
  readonly hint = input<string>();
  /** Whom was picked from the list so far, by the name that is in the text. */
  readonly mentions = model<readonly UserRef[]>([]);

  private readonly control = viewChild.required<ElementRef<HTMLTextAreaElement>>('control');

  protected readonly state = computed(() => this.field()());
  protected readonly showError = computed(() => this.state().touched() && this.state().invalid());
  protected readonly errorMessage = computed(() => this.state().errors()[0]?.message);
  protected readonly hintId = computed(() => `${this.inputId()}-hint`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly listboxId = computed(() => `${this.inputId()}-people`);
  protected readonly describedBy = computed(() => {
    const ids = [];
    if (this.hint()) {
      ids.push(this.hintId());
    }
    if (this.showError()) {
      ids.push(this.errorId());
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });

  private readonly focused = signal(false);
  private readonly caret = signal(0);
  /** The `@` the person closed the list for (Escape) or finished a pick at: the list stays away until another one is typed. */
  private readonly dismissedAt = signal<number | null>(null);

  /** The name being typed at the caret, unless the list was closed for it or the textarea has no focus. */
  private readonly searching = computed(() => {
    const found = findMentionQuery(this.state().value(), this.caret());
    return this.focused() && found && found.start !== this.dismissedAt() ? found : null;
  });

  protected readonly results = signal<readonly UserRef[]>([]);
  private readonly searchState = signal<SearchState>('idle');
  protected readonly activeIndex = signal(0);
  private readonly picked = signal<string | null>(null);

  protected readonly open = computed(() => this.searching() !== null && this.results().length > 0);
  protected readonly activeOptionId = computed(() => (this.open() ? this.optionId(this.activeIndex()) : null));

  /** What a screen reader hears; the list itself is read through `aria-activedescendant`. */
  protected readonly announcement = computed(() => {
    const picked = this.picked();
    if (picked) {
      return `Se mencionó a ${picked}.`;
    }
    if (this.searching() === null || this.searchState() === 'loading' || this.searchState() === 'idle') {
      return '';
    }
    if (this.searchState() === 'failed') {
      return 'No se pudo buscar personas.';
    }
    const count = this.results().length;
    return count === 0
      ? 'No hay personas que coincidan.'
      : `${count} ${count === 1 ? 'persona' : 'personas'}. Usa las flechas arriba y abajo, Enter para elegir y Escape para cerrar.`;
  });

  constructor() {
    toObservable(computed(() => this.searching()?.query ?? null))
      .pipe(
        switchMap((query) => {
          if (query === null) {
            return of({ state: 'idle' as SearchState, found: [] as readonly UserRef[] });
          }
          return timer(SEARCH_DELAY_MS).pipe(
            switchMap(() => this.users.search(query)),
            map((found) => ({ state: 'done' as SearchState, found })),
            catchError(() => of({ state: 'failed' as SearchState, found: [] as readonly UserRef[] })),
            // a newer keystroke replaces this search, and the people already listed stay until the new answer
            startWith({ state: 'loading' as SearchState, found: null }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ state, found }) => {
        this.searchState.set(state);
        if (found !== null) {
          this.results.set(found);
          this.activeIndex.set(0);
        }
      });
  }

  protected optionId(index: number): string {
    return `${this.inputId()}-person-${index}`;
  }

  protected onFocus(): void {
    this.focused.set(true);
    this.syncCaret();
  }

  protected onBlur(): void {
    this.focused.set(false);
  }

  /** The caret moved (typing, clicking, arrow keys): a new `@` context may have started or ended. */
  protected syncCaret(): void {
    const element = this.control().nativeElement;
    const caret = element.selectionStart ?? 0;
    this.caret.set(caret);
    if (findMentionQuery(element.value, caret) === null) {
      this.dismissedAt.set(null); // no `@` context any more: the next one starts fresh
    }
  }

  protected onInput(): void {
    this.picked.set(null);
    this.syncCaret();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (!this.open() || event.isComposing || count === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        this.activeIndex.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        this.activeIndex.update((index) => (index - 1 + count) % count);
        break;
      case 'Enter':
        this.pick(this.results()[this.activeIndex()]);
        break;
      case 'Escape':
        this.dismissedAt.set(this.searching()?.start ?? null);
        event.stopPropagation();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  protected pick(user: UserRef | undefined): void {
    const query = this.searching();
    if (!user || !query) {
      return;
    }
    const element = this.control().nativeElement;
    const inserted = insertMention(this.state().value(), query, element.selectionStart ?? this.caret(), user);
    const chosen = pickOf(user);
    this.state().value.set(inserted.text);
    this.mentions.update((mentions) => [...mentions, chosen]);
    this.dismissedAt.set(query.start);
    this.caret.set(inserted.caret);
    this.picked.set(chosen.fullName);
    // the text reaches the textarea on the next render; the caret can only be put after it
    afterNextRender(
      () => {
        element.focus();
        element.setSelectionRange(inserted.caret, inserted.caret);
      },
      { injector: this.injector },
    );
  }
}
