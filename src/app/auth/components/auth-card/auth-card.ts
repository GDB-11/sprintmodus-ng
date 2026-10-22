import { Component, input } from '@angular/core';
import { ThemeToggle } from '../../../shared/layout/theme-toggle/theme-toggle';
import { Logo } from '../../../shared/ui/logo/logo';

/** Page shell shared by the login and registration pages: wallpaper, one centred glass card, logo mark and the page's `<h1>`. */
@Component({
  selector: 'app-auth-card',
  imports: [Logo, ThemeToggle],
  templateUrl: './auth-card.html',
})
export class AuthCard {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
}
