import { Component, input, model, output } from '@angular/core';
import { Button } from '../button/button';
import { Dialog } from '../dialog/dialog';

/**
 * A modal "are you sure?" over `app-dialog`, for actions whose consequences reach beyond the thing the user is looking at
 * (deleting a parent takes its children with it, deleting a project takes its sprints). The projected content says what
 * will happen; `confirm` fires once and the caller closes it (`open`) when the work is done, so `busy` can show progress.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Dialog, Button],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly confirmLabel = input('Sí, continuar');
  readonly cancelLabel = input('Cancelar');
  readonly busy = input(false);
  readonly open = model(false);

  readonly confirm = output<void>();
}
