import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/** "Something failed" placeholder with a "Reintentar" action. */
@Component({
  selector: 'app-error-state',
  imports: [Icon, Button],
  templateUrl: './error-state.html',
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
