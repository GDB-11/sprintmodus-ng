import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, map, Subject, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Page } from '../../../shared/ui/page/page';
import { describeNotification } from '../../models/notification-description';
import { InboxNotification } from '../../models/notification.models';
import { InboxService } from '../../services/inbox.service';

const PAGE_SIZE = 20;
const SECONDARY_BUTTON_CLASSES =
  'rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:focus-visible:outline-secondary-400';

/**
 * The signed-in user's notifications, newest first, twenty at a time. Each one is a link to its work item (opening it marks it
 * as read), and can be marked as read by itself or all together. What happened to the list is said in a `role="status"` line.
 */
@Component({
  selector: 'app-notification-list',
  imports: [DatePipe, Page, RouterLink, Checkbox],
  templateUrl: './notification-list.html',
})
export class NotificationList {
  private readonly inbox = inject(InboxService);

  protected readonly buttonClasses = SECONDARY_BUTTON_CLASSES;
  protected readonly items = signal<readonly InboxNotification[]>([]);
  protected readonly total = signal(0);
  protected readonly unreadOnly = signal(false);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly working = signal(false);
  protected readonly status = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly hasMore = computed(() => this.items().length < this.total());
  protected readonly hasUnread = computed(() => this.items().some((item) => !item.isRead) || (this.inbox.unreadCount() ?? 0) > 0);

  private pages = 0;
  /** What to fetch: the first page again (a reload) or the next one; a newer request replaces an older one. */
  private readonly requests = new Subject<'reload' | 'more'>();

  constructor() {
    this.requests
      .pipe(
        switchMap((kind) => {
          this.loading.set(true);
          this.failed.set(false);
          const page = kind === 'more' ? this.pages : 0;
          return this.inbox.list(page, PAGE_SIZE, this.unreadOnly()).pipe(
            catchError(() => {
              this.failed.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
            map((result) => ({ kind, result })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ kind, result }) => {
        this.items.update((shown) => (kind === 'more' ? [...shown, ...result.items] : result.items));
        this.pages = kind === 'more' ? this.pages + 1 : 1;
        this.total.set(result.total);
        this.loading.set(false);
      });
    this.reload();
  }

  protected describe(notification: InboxNotification): string {
    return describeNotification(notification);
  }

  protected toggleUnreadOnly(): void {
    this.unreadOnly.update((only) => !only);
    this.status.set(this.unreadOnly() ? 'Mostrando solo las notificaciones sin leer.' : 'Mostrando todas las notificaciones.');
    this.reload();
  }

  protected reload(): void {
    this.inbox.refreshCount();
    this.requests.next('reload');
  }

  protected showMore(): void {
    this.requests.next('more');
  }

  /** Following the link is what opens it; the mark is sent alongside, and a failure of it is not worth stopping the reader for. */
  protected open(notification: InboxNotification): void {
    if (!notification.isRead) {
      this.inbox.markRead(notification.notificationCode).subscribe({ error: () => undefined });
    }
  }

  protected markRead(notification: InboxNotification): void {
    this.working.set(true);
    this.errorMessage.set(null);
    this.inbox.markRead(notification.notificationCode).subscribe({
      next: () => {
        this.items.update((items) =>
          this.unreadOnly()
            ? items.filter((item) => item.notificationCode !== notification.notificationCode)
            : items.map((item) => (item.notificationCode === notification.notificationCode ? { ...item, isRead: true } : item)),
        );
        if (this.unreadOnly()) {
          this.total.update((total) => Math.max(0, total - 1));
        }
        this.status.set('Notificación marcada como leída.');
        this.working.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo marcar la notificación como leída.'));
        this.working.set(false);
      },
    });
  }

  protected markAllRead(): void {
    this.working.set(true);
    this.errorMessage.set(null);
    this.inbox.markAllRead().subscribe({
      next: () => {
        this.status.set('Todas las notificaciones están marcadas como leídas.');
        this.working.set(false);
        this.reload();
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudieron marcar las notificaciones como leídas.'));
        this.working.set(false);
      },
    });
  }
}
