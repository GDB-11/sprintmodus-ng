import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/services/auth.service';
import { InboxService } from './notifications/services/inbox.service';
import { NotificationOutlet } from './shared/notifications/notification-outlet/notification-outlet';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  imports: [RouterOutlet, NotificationOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const auth = inject(AuthService);
    const inbox = inject(InboxService);
    inject(ThemeService); // applies claro/oscuro/sistema for the whole session; see index.html for the pre-bootstrap flash guard
    // the plan, limits and role are read again when the session starts and whenever the window regains focus, so a
    // change made by the owner (a new plan) reaches everyone else without logging in again
    const refresh = () => {
      if (auth.isAuthenticated()) auth.refreshSession().subscribe({ error: () => undefined });
    };
    const signedIn = computed(() => auth.currentUser() !== null); // a refresh replaces the session: do not re-run on it
    effect(() => {
      if (!signedIn()) return;
      untracked(() => {
        document.defaultView?.addEventListener('focus', refresh);
        refresh();
      });
    });
    // one poll of the unread count for the whole session: it starts with it and stops when it ends
    effect(() => {
      const active = signedIn();
      untracked(() => (active ? inbox.start() : inbox.stop()));
    });
  }
}
