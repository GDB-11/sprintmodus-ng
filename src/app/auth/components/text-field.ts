import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

/** Labelled text input bound to a Signal Forms field, with hint and validation message. */
@Component({
  selector: 'app-text-field',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1.5">
      <label [for]="inputId()" class="text-sm font-medium">{{ label() }}</label>
      <input
        [id]="inputId()"
        [type]="type()"
        [autocomplete]="autocomplete()"
        [formField]="field()"
        [attr.aria-required]="state().required()"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
        class="rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400"
      />
      @if (hint()) {
        <p [id]="hintId()" class="text-sm text-neutral-800 dark:text-neutral-300">{{ hint() }}</p>
      }
      @if (showError()) {
        <p [id]="errorId()" role="alert" class="text-sm font-medium text-error-800 dark:text-error-300">
          {{ errorMessage() }}
        </p>
      }
    </div>
  `,
})
export class TextField {
  readonly field = input.required<FieldTree<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input('text');
  readonly autocomplete = input('off');
  readonly hint = input<string>();

  protected readonly state = computed(() => this.field()());
  protected readonly showError = computed(() => this.state().touched() && this.state().invalid());
  protected readonly errorMessage = computed(() => this.state().errors()[0]?.message);

  protected readonly hintId = computed(() => `${this.inputId()}-hint`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
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
}
