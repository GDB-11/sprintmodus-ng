import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsBell } from '../../../notifications/components/notifications-bell/notifications-bell';

/** Page shell of the signed-in area: heading, the notifications bell, a way back and the page content. */
@Component({
  selector: 'app-page',
  imports: [NotificationsBell, RouterLink],
  templateUrl: './page.html',
})
export class Page {
  readonly heading = input.required<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backLabel = input('Volver');
}
