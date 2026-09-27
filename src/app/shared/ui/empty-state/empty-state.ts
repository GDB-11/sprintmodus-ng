import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/** "Nothing here yet" placeholder: an icon, a message, and an optional projected action. */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly icon = input<IconName>('info');
  readonly message = input.required<string>();
}
