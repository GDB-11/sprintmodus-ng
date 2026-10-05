import { Component, computed, input } from '@angular/core';

/** Wraps a native `<li role="option">` inside `app-menu-surface` with the active/inactive highlight look. */
@Component({
  selector: 'li[appMenuOption]',
  templateUrl: './menu-option.html',
  host: {
    '[class]': 'classes()',
  },
})
export class MenuOption {
  readonly active = input(false);

  protected readonly classes = computed(() =>
    this.active()
      ? 'cursor-pointer rounded-sm bg-primary-500 px-3 py-2 font-semibold text-neutral-900'
      : 'cursor-pointer rounded-sm px-3 py-2 text-text',
  );
}
