import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, computed, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';
import { nextEnabledIndex, SelectMenuOption } from './select-option';

export type { SelectMenuOption };

let nextId = 0;

/**
 * A custom single-choice select with the aero-glass look: a glass trigger that opens a floating glass list. It is the
 * ARIA "select-only combobox": the trigger keeps focus and points at the active option with `aria-activedescendant`.
 * Keys: Arrow Up/Down, Home/End, Enter/Space choose, Escape closes, a letter jumps to the next option starting with it.
 */
@Component({
  selector: 'app-select-menu',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, Icon],
  templateUrl: './select-menu.html',
})
export class SelectMenu implements FormValueControl<string> {
  /** Names the control for screen readers ("Proyecto"); the current value is appended to it. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectMenuOption[]>();
  /** The chosen option's value; `''` (or a value no option has) means nothing is chosen and the placeholder shows. */
  readonly value = model('');
  /** Choosing runs something ("Mover a…") instead of setting a value: the trigger goes back to its placeholder at once. */
  readonly action = input(false);
  readonly disabled = input(false);
  /** Set by Signal Forms (`[formField]`) or by hand: marks the trigger `aria-invalid`. */
  readonly invalid = input(false);
  readonly touched = input(false);
  /** Ids of the hint/error paragraphs that describe the control. */
  readonly describedBy = input<string | null>(null);
  /** The trigger's `id`, so a visible `<label for>` points at it. */
  readonly inputId = input<string>();
  /** Fires when the list closes: Signal Forms marks the field touched. */
  readonly touch = output<void>();
  /** Shown on the trigger while nothing is selected. */
  readonly placeholder = input('Seleccionar');
  /** Shown inside the open list when there are no options. */
  readonly emptyText = input('No hay opciones.');

  protected readonly uid = `select-menu-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly selected = computed(() => this.options().find((option) => option.value === this.value()) ?? null);
  protected readonly accessibleName = computed(() => `${this.label()}: ${this.selected()?.label ?? this.placeholder()}`);
  protected readonly activeId = computed(() => (this.open() && this.options().length ? this.optionId(this.activeIndex()) : null));
  /** The trigger's width, measured each time the list opens (a computed would keep the first, possibly stale, measure). */
  protected readonly minWidth = signal(0);

  protected optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.show();
    }
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.touch.emit();
    }
  }

  private show(): void {
    if (this.disabled()) {
      return;
    }
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : Math.max(0, nextEnabledIndex(this.options(), -1, 1)));
    this.minWidth.set(this.trigger().nativeElement.offsetWidth);
    this.open.set(true);
    this.scrollActiveIntoView();
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    if (option?.disabled) {
      return;
    }
    if (option) {
      this.value.set(option.value);
      if (this.action()) {
        this.value.set('');
      }
    }
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) {
          this.show();
          return;
        }
        const next = nextEnabledIndex(this.options(), this.activeIndex(), event.key === 'ArrowDown' ? 1 : -1);
        if (next >= 0) {
          this.move(next);
        }
        return;
      }
      case 'Home':
      case 'End':
        if (this.open()) {
          event.preventDefault();
          const edge = event.key === 'Home' ? nextEnabledIndex(this.options(), -1, 1) : nextEnabledIndex(this.options(), count, -1);
          if (edge >= 0) {
            this.move(edge);
          }
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open()) {
          this.choose(this.activeIndex());
        } else {
          this.show();
        }
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const letter = event.key.toLowerCase();
      const options = this.options();
      for (let offset = 1; offset <= count; offset++) {
        const index = (this.activeIndex() + offset) % count;
        if (!options[index].disabled && options[index].label.toLowerCase().startsWith(letter)) {
          if (!this.open()) {
            this.show();
          }
          this.move(index);
          return;
        }
      }
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
