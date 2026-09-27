import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';

let nextId = 0;

/** The inline `role="alertdialog"` next to a triggering control (never a modal overlay). See `work-item-detail`'s delete confirmation for the pattern this replaces. */
@Component({
  selector: 'app-confirm-inline',
  imports: [Button],
  templateUrl: './confirm-inline.html',
})
export class ConfirmInline {
  readonly question = input.required<string>();
  readonly confirmLabel = input('Sí, continuar');
  readonly cancelLabel = input('Cancelar');
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected readonly questionId = `confirm-inline-question-${nextId++}`;
}
