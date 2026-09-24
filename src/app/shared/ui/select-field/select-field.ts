import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

export interface SelectOption {
  value: string;
  label: string;
}

/** Labelled native select bound to a Signal Forms field, with hint and validation message. */
@Component({
  selector: 'app-select-field',
  imports: [FormField],
  templateUrl: './select-field.html',
})
export class SelectField {
  readonly field = input.required<FieldTree<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
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
