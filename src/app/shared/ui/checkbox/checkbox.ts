import { Component, input, model } from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';

/**
 * The platform's checkbox: a native `<input type="checkbox">` (so keyboard, focus, form and screen-reader behaviour are
 * the browser's) drawn as a rounded control-fill box that fills with the primary colour and shows a check mark. The label
 * is the projected content; with none, pass `ariaLabel`. Works two ways: `[(checked)]`, or `[formField]` (it is a Signal
 * Forms checkbox control).
 */
@Component({
  selector: 'app-checkbox',
  imports: [Icon],
  templateUrl: './checkbox.html',
})
export class Checkbox implements FormCheckboxControl {
  readonly checked = model(false);
  readonly disabled = input(false);
  /** Only when there is no projected label text. */
  readonly ariaLabel = input<string>();

  protected onChange(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
