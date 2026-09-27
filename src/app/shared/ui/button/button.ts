import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';
export type ButtonSize = 'normal' | 'compact' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'gloss bg-primary-700 text-white hover:bg-primary-600 dark:bg-primary-700 dark:hover:bg-primary-600',
  secondary: 'border border-neutral-700 bg-transparent text-text hover:bg-control-track dark:border-neutral-400',
  destructive: 'bg-error-800 text-white hover:bg-error-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  normal: 'px-4 py-2.5 text-sm',
  compact: 'px-3 py-1.5 text-sm',
  icon: 'p-2',
};

/**
 * Wraps a native `<button>`/`<a>` with the three Sprintmodus button looks, so semantics, keyboard and axe behaviour
 * stay the browser's. Use the native `disabled` + `title` for "disabled with a reason"; pair with `app-disabled-reason`
 * when the reason also needs to be visible on touch.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  templateUrl: './button.html',
  host: {
    '[class]': 'classes()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('normal');

  protected readonly classes = computed(
    () =>
      `inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors duration-150 ` +
      `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 ` +
      `disabled:opacity-60 disabled:pointer-events-none dark:focus-visible:outline-secondary-400 ` +
      `${VARIANT_CLASSES[this.variant()]} ${SIZE_CLASSES[this.size()]}`,
  );
}
