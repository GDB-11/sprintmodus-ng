import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, computed, ElementRef, input, model, signal, viewChild } from '@angular/core';
import { Icon } from '../icon/icon';

export interface SelectMenuOption {
  value: string;
  label: string;
  /** A short secondary tag shown beside the label (a project key, for example). */
  hint?: string;
}

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
export class SelectMenu {
  /** Names the control for screen readers ("Proyecto"); the current value is appended to it. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectMenuOption[]>();
  readonly value = model<string | null>(null);
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
  protected readonly minWidth = computed(() => this.trigger().nativeElement.offsetWidth);

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
    this.open.set(false);
  }

  private show(): void {
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(Math.max(0, selectedIndex));
    this.open.set(true);
    this.scrollActiveIntoView();
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    if (option) {
      this.value.set(option.value);
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
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.move((this.activeIndex() + step + count) % Math.max(count, 1));
        return;
      }
      case 'Home':
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.move(event.key === 'Home' ? 0 : count - 1);
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
        if (options[index].label.toLowerCase().startsWith(letter)) {
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
