import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Panel } from '../panel/panel';

/**
 * "Acceso restringido": what a screen shows instead of its controls when the signed-in user's role is not enough. It says
 * why, never redirects. The backend refuses the same actions; this is the explanation, not the protection.
 */
@Component({
  selector: 'app-not-allowed',
  imports: [Icon, Panel],
  templateUrl: './not-allowed.html',
})
export class NotAllowed {
  readonly heading = input('Acceso restringido');
  readonly message = input.required<string>();
}
