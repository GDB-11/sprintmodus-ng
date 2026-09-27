import { Component, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/services/auth.service';
import { InboxService } from './notifications/services/inbox.service';
import { NotificationOutlet } from './shared/notifications/notification-outlet/notification-outlet';

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
    // one poll of the unread count for the whole session: it starts with it and stops when it ends
    effect(() => {
      const signedIn = auth.currentUser() !== null;
      untracked(() => (signedIn ? inbox.start() : inbox.stop()));
    });
  }
}
