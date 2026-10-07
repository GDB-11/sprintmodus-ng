import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, computed, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';
import { nextEnabledIndex, normalizeText, SelectMenuOption } from '../select-menu/select-option';

let nextId = 0;

/**
 * A single-choice select whose list can be filtered by typing: the same glass trigger as `app-select-menu`, opening a
 * floating glass panel with a search box above the options (accents and case are ignored; the hint is searched too). Focus
 * moves into the search box, which is the ARIA combobox and points at the active option with `aria-activedescendant`.
 * Keys: type to filter, Arrow Up/Down, Home/End, Enter chooses, Escape closes and returns to the trigger.
 */
@Component({
  selector: 'app-searchable-select',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, Icon],
  templateUrl: './searchable-select.html',
})
export class SearchableSelect implements FormValueControl<string> {
  /** Names the control for screen readers; the current value is appended to it. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectMenuOption[]>();
  readonly value = model('');
  readonly placeholder = input('Seleccionar');
  readonly searchPlaceholder = input('Buscar…');
  /** Shown inside the open list when nothing matches the search (or there are no options). */
  readonly emptyText = input('Ningún resultado.');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly describedBy = input<string | null>(null);
  readonly inputId = input<string>();
  readonly touch = output<void>();

  protected readonly uid = `searchable-select-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  protected readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly selected = computed(() => this.options().find((option) => option.value === this.value()) ?? null);
  protected readonly accessibleName = computed(() => `${this.label()}: ${this.selected()?.label ?? this.placeholder()}`);
  /** At least the trigger's width (measured each time the list opens), and wide enough for a search box. */
  protected readonly minWidth = signal(240);

  /** The options that match the search, in their own order. */
  protected readonly visible = computed(() => {
    const query = normalizeText(this.query().trim());
    return query ? this.options().filter((option) => normalizeText(`${option.label} ${option.hint ?? ''}`).includes(query)) : this.options();
  });
  protected readonly activeId = computed(() => (this.open() && this.visible().length ? this.optionId(this.activeIndex()) : null));
  protected readonly resultsText = computed(() => {
    const count = this.visible().length;
    return count === 0 ? this.emptyText() : count === 1 ? '1 resultado' : `${count} resultados`;
  });

  protected optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else if (!this.disabled()) {
      this.query.set('');
      const selectedIndex = this.options().findIndex((option) => option.value === this.value());
      this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : Math.max(0, nextEnabledIndex(this.options(), -1, 1)));
      this.minWidth.set(Math.max(this.trigger().nativeElement.offsetWidth, 240));
      this.open.set(true);
    }
  }

  protected close(refocus = false): void {
    if (this.open()) {
      this.open.set(false);
      this.touch.emit();
    }
    if (refocus) {
      this.trigger().nativeElement.focus();
    }
  }

  /** Called when the panel is attached: put the caret in the search box and show the chosen option. */
  protected onAttached(): void {
    setTimeout(() => {
      this.searchBox()?.nativeElement.focus();
      this.scrollActiveIntoView();
    });
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(Math.max(0, nextEnabledIndex(this.visible(), -1, 1)));
  }

  protected choose(index: number): void {
    const option = this.visible()[index];
    if (!option || option.disabled) {
      return;
    }
    this.value.set(option.value);
    this.close(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.visible();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const next = nextEnabledIndex(options, this.activeIndex(), event.key === 'ArrowDown' ? 1 : -1);
        if (next >= 0) {
          this.move(next);
        }
        return;
      }
      case 'Home':
      case 'End': {
        event.preventDefault();
        const edge = event.key === 'Home' ? nextEnabledIndex(options, -1, 1) : nextEnabledIndex(options, options.length, -1);
        if (edge >= 0) {
          this.move(edge);
        }
        return;
      }
      case 'Enter':
        event.preventDefault();
        this.choose(this.activeIndex());
        return;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.toggle();
    }
  }

  private move(index: number): void {
    this.activeIndex.set(index);
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => document.getElementById(this.optionId(this.activeIndex()))?.scrollIntoView?.({ block: 'nearest' }));
  }
}
