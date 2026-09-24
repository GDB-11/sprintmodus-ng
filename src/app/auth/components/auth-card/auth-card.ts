import { Component, input } from '@angular/core';

/** Page shell shared by the login and registration pages. */
@Component({
  selector: 'app-auth-card',
  templateUrl: './auth-card.html',
})
export class AuthCard {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
}
