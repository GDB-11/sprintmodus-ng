import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InboxService } from '../../services/inbox.service';

/** Above this the badge says `99+`; the accessible name still says the real number. */
const BADGE_CAP = 99;

/**
 * The link to the notifications with how many are unread. The count is the inbox service's, which polls once for the whole
 * app: this component asks for nothing itself. Whether there is anything new is said in words, never only by the badge's colour.
 */
@Component({
  selector: 'app-notifications-bell',
  imports: [RouterLink],
  templateUrl: './notifications-bell.html',
})
export class NotificationsBell {
  private readonly inbox = inject(InboxService);

  protected readonly announcement = this.inbox.announcement;
  protected readonly count = computed(() => this.inbox.unreadCount() ?? 0);
  protected readonly badge = computed(() => (this.count() > BADGE_CAP ? `${BADGE_CAP}+` : `${this.count()}`));
  protected readonly label = computed(() => {
    const count = this.count();
    if (count === 0) {
      return 'Notificaciones';
    }
    return `Notificaciones, ${count} sin leer`;
  });
}
