import { Component, ElementRef, effect, input, model, untracked, viewChild } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * A modal dialog over a native `<dialog>`: the browser supplies the focus trap, Escape and returning focus to the trigger.
 * Two-way bound with `[(open)]`; the heading names it. Clicking the backdrop or the close button closes it.
 */
@Component({
  selector: 'app-dialog',
  imports: [Button, Icon],
  templateUrl: './dialog.html',
})
export class Dialog {
  readonly heading = input.required<string>();
  readonly open = model(false);

  protected readonly headingId = `dialog-heading-${nextId++}`;
  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  constructor() {
    effect(() => {
      const isOpen = this.open();
      untracked(() => {
        const dialog = this.dialogEl().nativeElement;
        if (isOpen && !dialog.open) {
          typeof dialog.showModal === 'function' ? dialog.showModal() : dialog.setAttribute('open', '');
        } else if (!isOpen && dialog.open) {
          typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open');
        }
      });
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) {
      this.open.set(false);
    }
  }

  protected onNativeClose(): void {
    this.open.set(false);
  }
}
