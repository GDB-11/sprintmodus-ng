import { OverlayModule } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { describeNotification } from '../../../notifications/models/notification-description';
import { InboxService } from '../../../notifications/services/inbox.service';
import { valueOf } from '../../resource-value';
import { Badge } from '../../ui/badge/badge';
import { Icon } from '../../ui/icon/icon';
import { Popover } from '../../ui/popover/popover';

const BADGE_CAP = 99;
/** Below this width the bell goes straight to `/notifications` instead of opening a cramped popover. */
const PHONE_BREAKPOINT_QUERY = '(max-width: 767px)';

/** The latest five notifications, from the top bar. Straight to `/notifications` on phone instead of a popover. */
@Component({
  selector: 'app-notifications-popover',
  imports: [OverlayModule, Icon, Badge, Popover],
  templateUrl: './notifications-popover.html',
})
export class NotificationsPopover {
  private readonly inbox = inject(InboxService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly open = signal(false);
  protected readonly count = computed(() => this.inbox.unreadCount() ?? 0);
  protected readonly badge = computed(() => (this.count() > BADGE_CAP ? `${BADGE_CAP}+` : `${this.count()}`));
  protected readonly label = computed(() => (this.count() > 0 ? `Notificaciones, ${this.count()} sin leer` : 'Notificaciones'));
  protected readonly describe = describeNotification;

  private readonly recent = rxResource({
    params: () => (this.open() ? {} : undefined),
    stream: () => this.inbox.list(0, 5, false),
  });
  protected readonly notifications = computed(() => valueOf(this.recent)?.items ?? []);
  protected readonly isLoading = computed(() => this.recent.isLoading());
  protected readonly hasError = computed(() => !!this.recent.error());

  protected toggle(): void {
    const isPhone = this.document.defaultView?.matchMedia?.(PHONE_BREAKPOINT_QUERY).matches ?? false;
    if (isPhone) {
      void this.router.navigateByUrl('/notifications');
      return;
    }
    this.open.set(!this.open());
  }

  protected select(notificationCode: string, workItemCode: string): void {
    this.open.set(false);
    if (!this.notifications().find((n) => n.notificationCode === notificationCode)?.isRead) {
      this.inbox.markRead(notificationCode).subscribe();
    }
    void this.router.navigateByUrl(`/work-items/${workItemCode}`);
  }

  protected markAllRead(): void {
    this.inbox.markAllRead().subscribe(() => this.recent.reload());
  }

  protected viewAll(): void {
    this.open.set(false);
    void this.router.navigateByUrl('/notifications');
  }
}
