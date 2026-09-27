import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InboxPage } from '../models/notification.models';

/** How often the number on the bell is asked for again. There is no push: the board socket belongs to one project. */
export const UNREAD_POLL_MS = 60_000;

/**
 * The signed-in user's notifications, and the unread count the bell shows. The count is fetched when the session starts, when
 * the window gets focus again and every 60 seconds (not while the tab is hidden); a failed poll keeps the last number.
 * Everything is the caller's own: the API has no way to ask for somebody else's.
 */
@Service()
export class InboxService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  private readonly url = `${environment.apiUrl}/api/notifications`;

  /** `null` until the first answer, and again after the session ends. */
  readonly unreadCount = signal<number | null>(null);
  /** Said to screen readers when a poll finds more unread ones than before; empty otherwise. */
  readonly announcement = signal('');

  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly onFocus = () => this.refreshCount();

  /** Starts polling for the signed-in session. Calling it again does nothing. */
  start(): void {
    if (this.timer !== undefined) {
      return;
    }
    this.refreshCount();
    this.timer = setInterval(() => {
      if (!this.document.hidden) {
        this.refreshCount();
      }
    }, UNREAD_POLL_MS);
    this.document.defaultView?.addEventListener('focus', this.onFocus);
  }

  /** Stops polling and forgets the count (the session ended). */
  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.document.defaultView?.removeEventListener('focus', this.onFocus);
    }
    this.unreadCount.set(null);
    this.announcement.set('');
  }

  refreshCount(): void {
    this.http.get<{ count: number }>(`${this.url}/unread-count`).subscribe({
      next: ({ count }) => {
        const before = this.unreadCount();
        this.unreadCount.set(count);
        if (before !== null && count > before) {
          this.announcement.set(count === 1 ? 'Tienes 1 notificación sin leer.' : `Tienes ${count} notificaciones sin leer.`);
        }
      },
      error: () => undefined, // keep the last number: a bell that flickers to nothing on a network blip is worse than a stale one
    });
  }

  /** One page of notifications, newest first. */
  list(page: number, size: number, unreadOnly: boolean): Observable<InboxPage> {
    const params = new HttpParams().set('page', page).set('size', size).set('unread', unreadOnly);
    return this.http.get<InboxPage>(this.url, { params });
  }

  markRead(notificationCode: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${notificationCode}/read`, null).pipe(tap(() => this.refreshCount()));
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.url}/read-all`, null).pipe(tap(() => this.unreadCount.set(0)));
  }
}
